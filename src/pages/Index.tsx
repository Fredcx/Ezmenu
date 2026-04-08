import { useState, useEffect } from 'react';
import { OrderProvider, useOrder } from '@/contexts/OrderContext';
import { supabase } from '@/lib/supabase';


import { RodizioSelectionScreen } from '@/components/RodizioSelectionScreen';
import { PaymentWrapper } from '@/components/PaymentWrapper';
import { GatewayScreen } from '@/components/GatewayScreen';
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
  const { occupyTable, establishmentId, clearTableSession } = useOrder();



  const [viewMode, setViewMode] = useState<'gateway' | 'login' | 'guest_menu' | 'authenticated'>('gateway');
  const [activeTab, setActiveTab] = useState<TabId>('menu');
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

    const checkSession = async () => {
      const storedAccess = localStorage.getItem('ez_menu_access');
      const storedTime = localStorage.getItem('ez_menu_access_time');
      const currentTableId = tableParam || localStorage.getItem('ez_menu_table_name');
      const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

      if (storedAccess === 'granted' && storedTime) {
        const isValid = (Date.now() - parseInt(storedTime, 10)) < SESSION_DURATION;
        
        // --- NEW: Session Lifecycle Validation ---
        // If we are at a table, verify it is still occupied in DB
        if (isValid && currentTableId && establishmentId) {
            const { data: tableData } = await supabase
                .from('restaurant_tables')
                .select('status')
                .eq('id', currentTableId)
                .eq('establishment_id', establishmentId)
                .single();
            
            if (tableData && tableData.status === 'free') {
                console.log("Table has been freed in DB. Resetring session...");
                clearTableSession();
                setViewMode('gateway');
                setIsLoadingSession(false);
                return;
            }
        }

        if (isValid) {
          setViewMode('authenticated');
          setActiveTab('menu');
          // If already at a table with active session, ensure it's occupied
          if ((tableParam || hasTable) && establishmentId) {
            occupyTable();
          }

        } else {

          localStorage.removeItem('ez_menu_access');
          localStorage.removeItem('ez_menu_access_time');
          setViewMode('gateway');
        }
      } else {
        setViewMode('gateway');
      }
      setIsLoadingSession(false);
    };

    checkSession();
  }, [window.location.search, establishmentId]);


  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail === 'rodizio') {
        setHomeView('rodizio');
        setActiveTab('home');
      } else if (e.detail === 'orders') {
        setActiveTab('orders');
      }
    };
    window.addEventListener('ez-menu-nav', handleNav);
    return () => window.removeEventListener('ez-menu-nav', handleNav);
  }, []);

  const [hasStarted, setHasStarted] = useState(false);
  const [homeView, setHomeView] = useState<'landing' | 'rodizio'>('landing');
  const [menuCategory, setMenuCategory] = useState<string | undefined>();
  const [initialMenu, setInitialMenu] = useState<string>('menu');
  const [isOccupying, setIsOccupying] = useState(false);


  const handleAccessGranted = async (name: string, email: string) => {
    setIsOccupying(true);
    try {
      console.log('User accessed:', name, email);
      
      localStorage.setItem('ez_menu_access', 'granted');
      localStorage.setItem('ez_menu_access_time', Date.now().toString());

      if (name) localStorage.setItem('ez_menu_client_name', name);
      if (email) localStorage.setItem('ez_menu_client_email', email.trim().toLowerCase());
        
      // Mark table as occupied immediately upon identification
      // occupyTable now handles its own internal identification retry
      if (hasTable) {
        const success = await occupyTable();
        if (!success) {
          localStorage.removeItem('ez_menu_access');
          setIsOccupying(false);
          return;
        }
      }

      setViewMode('authenticated');
      setActiveTab('menu');
    } catch (err) {
        console.error("Login Error:", err);
    } finally {
        setIsOccupying(false);
    }
  };



  if (!slug) {
    return <DiscoveryScreen />;
  }

  // Gate: Wait for establishment identification before showing any interactive screen
  if (isLoadingSession || !establishmentId) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#FAFAFA] p-6 selection:bg-primary/20">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
            <div className="absolute top-[-20%] -left-10 w-[70vw] h-[70vw] bg-primary/5 rounded-[100%] blur-[120px] opacity-60" />
            <div className="absolute bottom-[-10%] -right-20 w-[80vw] h-[80vw] bg-stone-300/20 rounded-[100%] blur-[120px] opacity-70" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-[5px] border-primary/10 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
                Identificando Estabelecimento...
            </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'gateway') {

    return (
      <GatewayScreen 
        tableName={localStorage.getItem('ez_menu_table_name')} 
        onOccupyTable={() => setViewMode('login')} 
        onViewMenu={() => setViewMode('guest_menu')} 
      />
    );
  }

  if (viewMode === 'login') {
    return (
        <AccessScreen 
            onGranted={handleAccessGranted} 
            hasTable={hasTable} 
            isLoading={isOccupying}
        />
    );
  }

  const handleTabChange = (tab: TabId) => {
    if (tab === 'home' && viewMode === 'guest_menu') {
        setViewMode('login');
        return;
    }
    setActiveTab(tab);
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
    setMenuCategory(undefined);
  };

  return (
    <div className="w-full h-[100dvh] flex justify-center bg-background overflow-hidden">
      <div className="w-full h-full bg-background flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'menu' && (
          <MenuScreen
            key={`${menuCategory}-${initialMenu}`}
            initialCategory={menuCategory}
            initialMenu={initialMenu}
            onNavigateToRodizio={() => setActiveTab('menu')}
            onBackToLanding={handleBackToLanding}
            hasTable={hasTable}
            isGuestMode={viewMode === 'guest_menu'}
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

      {activeTab !== 'cart' && activeTab !== 'account' && viewMode !== 'guest_menu' && (
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} hasTable={hasTable} variant="floating" viewMode={viewMode} />
      )}

      {viewMode === 'guest_menu' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <button
                onClick={() => setViewMode('login')}
                className="w-full bg-primary text-white py-4 rounded-2xl shadow-[0_15px_30px_rgba(237,27,46,0.3)] border border-primary/20 flex flex-col items-center justify-center gap-1 active:scale-95 transition-premium"
            >
                <span className="text-sm font-black uppercase tracking-wider">Começar seus pedidos!</span>
                <span className="text-[10px] font-semibold text-white/70 uppercase">Ocupe a mesa agora</span>
            </button>
        </div>
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
