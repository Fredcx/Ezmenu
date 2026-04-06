
import { Home, UtensilsCrossed, History, Bell, ShoppingCart, Receipt, ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrder } from '@/contexts/OrderContext';

export type TabId = 'home' | 'menu' | 'history' | 'service' | 'cart' | 'payment' | 'account' | 'orders';

interface BottomNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasTable?: boolean;
  variant?: 'default' | 'floating';
}

export function BottomNavigation({ activeTab, onTabChange, hasTable = false, variant = 'default' }: BottomNavigationProps) {
  const { t } = useLanguage();
  const { cart } = useOrder();
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const allTabs = [
    { id: 'home' as TabId, icon: Home, label: t('home') },
    { id: 'menu' as TabId, icon: UtensilsCrossed, label: t('menu') },
    { id: 'cart' as TabId, icon: ShoppingCart, label: t('cart'), shortLabel: t('orders') },
    { id: 'service' as TabId, icon: Bell, label: t('callService'), shortLabel: t('call') },
    { id: 'account' as TabId, icon: Receipt, label: t('account') },
  ];

  // If Guest (no table), show only Home
  const tabs = hasTable ? allTabs : allTabs.filter(t => ['home'].includes(t.id));

  const isFloating = variant === 'floating';

  return (
    <div className={isFloating
      ? "fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50"
      : "fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 md:rounded-t-[2.5rem] md:border md:border-border/30 md:max-w-4xl md:mx-auto md:mb-4 md:shadow-premium"}
    >
      <nav className={isFloating
        ? "bg-white/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.12)] border border-white/50 p-2 flex items-center justify-around"
        : "max-w-4xl mx-auto flex items-center justify-between px-6 py-3"}
      >
        <button
          onClick={() => onTabChange('home')}
          className={`relative flex flex-col items-center justify-center gap-1 transition-all ${isFloating ? 'p-2 w-16' : ''} ${activeTab === 'home' ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Home className={isFloating ? "w-6 h-6" : "w-5 h-5"} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wider uppercase leading-none">{t('home')}</span>
          {activeTab === 'home' && (
            <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-in zoom-in" />
          )}
        </button>

        <button
          onClick={() => onTabChange('menu')}
          className={`relative flex flex-col items-center justify-center gap-1 transition-all ${isFloating ? 'p-2 w-16' : ''} ${activeTab === 'menu' ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <UtensilsCrossed className={isFloating ? "w-6 h-6" : "w-5 h-5"} strokeWidth={activeTab === 'menu' ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wider uppercase leading-none">{t('menu')}</span>
          {activeTab === 'menu' && (
            <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-in zoom-in" />
          )}
        </button>

        <button
          onClick={() => onTabChange('service')}
          className={`relative flex flex-col items-center justify-center gap-1 transition-all ${isFloating ? 'p-2 w-16' : ''} ${activeTab === 'service' ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Bell className={isFloating ? "w-6 h-6" : "w-5 h-5"} strokeWidth={activeTab === 'service' ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wider uppercase leading-none">{t('call')}</span>
          {activeTab === 'service' && (
            <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-in zoom-in" />
          )}
        </button>

        <button
          onClick={() => onTabChange('orders')}
          className={`relative flex flex-col items-center justify-center gap-1 transition-all ${isFloating ? 'p-2 w-16' : ''} ${activeTab === 'orders' ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ClipboardList className={isFloating ? "w-6 h-6" : "w-5 h-5"} strokeWidth={activeTab === 'orders' ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wider uppercase leading-none">{t('orders')}</span>
          {activeTab === 'orders' && (
            <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-in zoom-in" />
          )}
        </button>

        <button
          onClick={() => onTabChange('account')}
          className={`relative flex flex-col items-center justify-center gap-1 transition-all ${isFloating ? 'p-2 w-16' : ''} ${activeTab === 'account' ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Receipt className={isFloating ? "w-6 h-6" : "w-5 h-5"} strokeWidth={activeTab === 'account' ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wider uppercase leading-none">{t('account')}</span>
          {activeTab === 'account' && (
            <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-in zoom-in" />
          )}
        </button>
      </nav>
    </div>
  );
}
