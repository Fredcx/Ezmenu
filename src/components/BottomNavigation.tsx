
import { Home, UtensilsCrossed, History, Bell, ShoppingCart, Receipt } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrder } from '@/contexts/OrderContext';

export type TabId = 'home' | 'menu' | 'history' | 'service' | 'cart' | 'payment' | 'account';

interface BottomNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasTable?: boolean;
}

export function BottomNavigation({ activeTab, onTabChange, hasTable = false }: BottomNavigationProps) {
  const { t } = useLanguage();
  const { cart } = useOrder();
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const allTabs = [
    { id: 'home' as TabId, icon: Home, label: t('home') },
    { id: 'menu' as TabId, icon: UtensilsCrossed, label: t('menu') },
    { id: 'cart' as TabId, icon: ShoppingCart, label: t('cart'), shortLabel: 'PEDIDOS' },
    { id: 'service' as TabId, icon: Bell, label: t('callService'), shortLabel: 'SERVIÇO' },
    { id: 'account' as TabId, icon: Receipt, label: 'CONTA' },
  ];

  // If Guest (no table), show only Home and Menu
  const tabs = hasTable ? allTabs : allTabs.filter(t => ['home', 'menu'].includes(t.id));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60]">
      {/* Gradient Fade for smooth transition */}
      <div className="absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />

      {/* Main Bar */}
      <div className="glass border-t border-white/20 pt-2 px-6 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className={`flex items-center ${tabs.length <= 2 ? 'justify-center gap-8' : 'justify-between'} max-w-md mx-auto relative`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="group relative flex flex-col items-center justify-center gap-1.5 min-w-[64px] py-2 transition-transform duration-100 active:scale-90"
              >
                <div className={`p-1.5 rounded-xl transition-all duration-300 relative ${isActive
                  ? 'text-primary scale-110'
                  : 'text-muted-foreground group-hover:text-foreground'
                  }`}>
                  <tab.icon className={`w-5 h-5 stroke-[2px] ${isActive ? 'fill-primary/10' : ''}`} />

                  {/* Active Glow behind icon */}
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  )}
                  {totalItems > 0 && tab.id === 'cart' && (
                    <span className="absolute -top-2 -right-2 glass-card text-primary text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-primary/20">
                      {totalItems}
                    </span>
                  )}
                </div>

                <span className={`text-[9px] uppercase font-bold tracking-widest transition-all duration-300 ${isActive ? 'text-foreground translate-y-0' : 'text-muted-foreground/70 translate-y-0.5'
                  }`}>
                  {tab.shortLabel || tab.label}
                </span>

                {/* Red Underline Indicator */}
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] bg-primary rounded-full transition-all duration-300 ease-out ${isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                  }`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
