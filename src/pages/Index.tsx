import { useState, useEffect } from 'react';
import { OrderProvider } from '@/contexts/OrderContext';
import { RodizioSelectionScreen } from '@/components/RodizioSelectionScreen';
import { PaymentWrapper } from '@/components/PaymentWrapper';
import { LandingScreen } from '@/components/LandingScreen';
import { MenuScreen } from '@/components/MenuScreen';
import { useParams } from 'react-router-dom';
import { DiscoveryScreen } from '@/components/DiscoveryScreen';

import { CartView } from '@/components/CartView';
import { ServiceScreen } from '@/components/ServiceScreen';
import { BottomNavigation, TabId } from '@/components/BottomNavigation';
import { FloatingCartButton } from '@/components/FloatingCartButton';

import { AccessScreen } from '@/components/AccessScreen';

function AppContent() {
  const { slug, categorySlug } = useParams();
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [hasTable, setHasTable] = useState(false);
  const location = window.location.pathname;


  // Session Management (2 hours)
  useEffect(() => {
    // 1. Check for table in URL (This always takes precedence)
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('mesa') || params.get('table');

    if (tableParam) {
      localStorage.setItem('ez_menu_table_name', tableParam);
      setHasTable(true);
      console.log('Table set from URL:', tableParam);
    } else {
      // If no table in URL, we force Guest Mode (don't fallback to localStorage)
      // unless specifically requested by the user's flow
      setHasTable(false);
      // Optional: Clear table from localStorage to avoid old session persistence
      // localStorage.removeItem('ez_menu_table_name');
    }

    const checkSession = () => {
      const storedAccess = localStorage.getItem('ez_menu_access');
      const storedTime = localStorage.getItem('ez_menu_access_time');
      const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

      if (storedAccess === 'granted' && storedTime) {
        const isValid = (Date.now() - parseInt(storedTime, 10)) < SESSION_DURATION;
        if (isValid) {
          setHasAccess(true);
        } else {
          localStorage.removeItem('ez_menu_access');
          localStorage.removeItem('ez_menu_access_time');
        }
      }
      setIsLoadingSession(false);
    };
    checkSession();
  }, []);

  const [hasStarted, setHasStarted] = useState(false);
  const [homeView, setHomeView] = useState<'landing' | 'rodizio'>('landing');
  const [menuCategory, setMenuCategory] = useState<string | undefined>();
  const [initialMenu, setInitialMenu] = useState<string>('menu');

  // Handle access grant
  const handleAccessGranted = (name: string, email: string) => {
    console.log('User accessed:', name, email);
    setHasAccess(true);
    localStorage.setItem('ez_menu_access', 'granted');
    localStorage.setItem('ez_menu_access_time', Date.now().toString());

    if (name === 'Visitante') {
      localStorage.removeItem('ez_menu_user_name');
      localStorage.removeItem('ez_menu_user_email');
      localStorage.removeItem('ez_menu_table_name');
      setHasTable(false);
    } else {
      if (name) localStorage.setItem('ez_menu_user_name', name);
      if (email) localStorage.setItem('ez_menu_user_email', email);
    }
  };

  if (!slug) {
    return <DiscoveryScreen />;
  }

  if (isLoadingSession) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!hasAccess) {
    return <AccessScreen onAccessGranted={handleAccessGranted} />;
  }

  const handleStartOrder = () => {
    setHasStarted(true);
    setInitialMenu(hasTable ? 'menu' : 'alacarte');
    setActiveTab('menu');
  };

  const handleTabChange = (tab: TabId) => {
    if (tab === 'home') {
      if (activeTab === 'home' && !hasTable) {
        window.location.href = '/';
        return;
      }
      setHomeView('landing');
      setActiveTab('home');
    } else {
      setActiveTab(tab);
    }
  };

  const handleLandingOption = (option: 'rodizio' | 'alacarte' | 'drinks' | 'desserts' | 'wines' | 'cocktails') => {
    switch (option) {
      case 'rodizio':
        setHomeView('rodizio');
        setActiveTab('home');
        break;
      case 'drinks':
        setInitialMenu('drinks');
        setActiveTab('menu');
        break;
      case 'desserts':
        setInitialMenu('desserts');
        setActiveTab('menu');
        break;
      case 'alacarte':
        setInitialMenu('alacarte');
        setActiveTab('menu');
        // Handle restaurant occupants if coming from landing-direct
        if (!hasStarted) setHasStarted(true);
        break;
      case 'wines':
        setInitialMenu('drinks');
        setMenuCategory('vinhos');
        setActiveTab('menu');
        break;
      case 'cocktails':
        setInitialMenu('drinks');
        setMenuCategory('drinks');
        setActiveTab('menu');
        break;
      case 'drinks':
        setInitialMenu('drinks');
        setMenuCategory('bebidas');
        setActiveTab('menu');
        break;
    }
  };

  const handleBackToLanding = () => {
    setHomeView('landing');
    setActiveTab('home');
    setMenuCategory(undefined);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'home' && (
          homeView === 'landing' ? (
            <LandingScreen onSelectOption={handleLandingOption} hasTable={hasTable} />
          ) : (
            <RodizioSelectionScreen
              onStartOrder={handleStartOrder}
              onBack={() => setHomeView('landing')}
              hasTable={hasTable}
            />
          )
        )}
        {activeTab === 'menu' && (
          <MenuScreen
            key={`${menuCategory}-${initialMenu}`}
            initialCategory={menuCategory}
            initialMenu={initialMenu}
            onNavigateToRodizio={() => handleLandingOption('rodizio')}
            onBackToLanding={handleBackToLanding}
            hasTable={hasTable}
          />
        )}
        {activeTab === 'account' && <PaymentWrapper onBack={() => setActiveTab('menu')} />}
        {activeTab === 'cart' && <CartView onBack={() => setActiveTab('menu')} onPayment={() => setActiveTab('payment')} />}
        {activeTab === 'payment' && <PaymentWrapper onBack={() => setActiveTab('cart')} />}
        {activeTab === 'service' && <ServiceScreen />}
      </div>

      <FloatingCartButton
        visible={activeTab === 'menu' && hasTable}
        onClick={() => setActiveTab('cart')}
      />

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} hasTable={hasTable} />
    </div>
  );
}

const Index = () => {
  return (
    <OrderProvider>
      <AppContent />
    </OrderProvider>
  );
};

export default Index;
