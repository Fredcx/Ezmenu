import { useState, useEffect } from 'react';
import { OrderProvider } from '@/contexts/OrderContext';
import { RodizioSelectionScreen } from '@/components/RodizioSelectionScreen';
import { PaymentWrapper } from '@/components/PaymentWrapper';
import { LandingScreenV2 as LandingScreen } from '@/components/LandingScreenV2';
import { MenuScreen } from '@/components/MenuScreen';
import { useParams } from 'react-router-dom';
import { DiscoveryScreen } from '@/components/DiscoveryScreen';

import { CartView } from '@/components/CartView';
import { OrdersView } from '@/components/OrdersView';
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
    // 1. Check for secure table token in URL ('q' parameter)
    const params = new URLSearchParams(window.location.search);
    let tableParam = null;
    
    // We NO LONGER accept ?table=M1 or ?mesa=M1 for security reasons.
    // The user MUST use the encrypted QR code link ?q=...

    // Decode secure table token if present
    const qToken = params.get('q');
    if (qToken) {
        try {
            // Check if it's the symbolized token format (eg: M_ZXNh...==_1)
            const parts = qToken.split('_');
            const actualToken = parts.length === 3 ? parts[1] : parts[0];

            const decoded = atob(actualToken);
            if (decoded.startsWith('ezmenu_tbl_')) {
                tableParam = decoded.replace('ezmenu_tbl_', '');
            }
        } catch (e) {
            console.error('Invalid table token');
        }
    }

    // Sanitize table ID to prevent path injections like "M1/login"
    if (tableParam) {
        tableParam = tableParam.replace(/[^a-zA-Z0-9-]/g, '');
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
  }, [window.location.search]);

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail === 'rodizio') {
        setHomeView('rodizio');
        setActiveTab('home');
      }
    };
    window.addEventListener('ez-menu-nav', handleNav);
    return () => window.removeEventListener('ez-menu-nav', handleNav);
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
      localStorage.removeItem('ez_menu_client_name');
      localStorage.removeItem('ez_menu_client_email');
      localStorage.removeItem('ez_menu_table_name');
      setHasTable(false);
    } else {
      if (name) localStorage.setItem('ez_menu_client_name', name);
      if (email) localStorage.setItem('ez_menu_client_email', email);
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

  const handleLandingOption = (option: any) => {
    const optionId = typeof option === 'string' ? option : option.id;

    if (option.categoryName) {
        setInitialMenu('alacarte');
        setMenuCategory(option.categoryName);
        setActiveTab('menu');
        return;
    }

    switch (optionId) {
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
    }
  };

  const handleBackToLanding = () => {
    setHomeView('landing');
    setActiveTab('home');
    setMenuCategory(undefined);
  };

  return (
    <div className="w-full min-h-[100dvh] flex justify-center bg-background sm:bg-black">
      <div className="w-full h-[100dvh] sm:max-w-[480px] bg-background flex flex-col relative sm:shadow-2xl overflow-hidden">
      <div className="flex-1 overflow-hidden relative flex flex-col">
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
        {activeTab === 'orders' && <OrdersView onBack={() => setActiveTab('menu')} />}
        {activeTab === 'payment' && <PaymentWrapper onBack={() => setActiveTab('cart')} />}
        {activeTab === 'service' && <ServiceScreen />}
      </div>

      <FloatingCartButton
        visible={activeTab === 'menu' && hasTable}
        onClick={() => setActiveTab('cart')}
      />

      {activeTab !== 'cart' && activeTab !== 'account' && (
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} hasTable={hasTable} variant="floating" />
      )}
      </div>
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
