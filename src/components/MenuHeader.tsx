import { BookOpen, Filter, Search, ChevronDown, ArrowLeft, LayoutGrid, Users, Monitor, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categories } from '@/data/menuData';
import { useState, useEffect } from 'react';
import { useOrder } from '@/contexts/OrderContext';
import { useMenu } from '@/contexts/MenuContext';
import { BrandingLogo } from './BrandingLogo';

interface MenuHeaderProps {
  selectedMenu: string;
  onMenuChange: (menuId: string) => void;
  onFilterClick: () => void;
  onSearchClick: () => void;
  isSearchActive?: boolean;
  onBack?: () => void;
  hasTable?: boolean;
}

export function MenuHeader({
  selectedMenu,
  onMenuChange,
  onFilterClick,
  onSearchClick,
  isSearchActive = false,
  onBack,
  hasTable = true
}: MenuHeaderProps) {
  const { restaurantType, session, currentClientId, occupants } = useOrder();
  const { establishment } = useMenu();
  const [showDropdown, setShowDropdown] = useState(false);
  const [turnTime, setTurnTime] = useState('00:00');
  const navigate = useNavigate();

  useEffect(() => {
    if (!session?.turnStartTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - session.turnStartTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTurnTime(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.turnStartTime]);

  const menus = [
    { id: 'rodizio', name: restaurantType === 'steakhouse' ? 'Rodízio de Carnes' : 'Rodízio' },
    { id: 'alacarte', name: 'À La Carte' },
    { id: 'desserts', name: 'Sobremesas' },
    { id: 'drinks', name: 'Bebidas' },
    { id: 'wines', name: 'Vinhos' },
    { id: 'cocktails', name: 'Drinks' },
  ];

  if (restaurantType === 'general') {
    // Remove Rodizio option for general restaurants
    menus.shift();
  }

  const currentMenu = menus.find(m => m.id === selectedMenu) || menus[0];

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-5 py-4 glass border-b border-border/40 transition-all duration-300 w-full max-w-[1920px] mx-auto">
      {/* Back Button or Menu Selector */}
      <div className="flex items-center gap-3">
        {!hasTable && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2.5 bg-secondary/80 hover:bg-secondary rounded-xl transition-all active:scale-95"
            title="Voltar para Início"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground mr-1">Início</span>
          </button>
        )}

        {hasTable ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-secondary/80 backdrop-blur-sm hover:bg-secondary border border-border/50 rounded-2xl px-3 sm:px-5 py-2.5 transition-premium shadow-sm active:scale-95 shrink-0"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-foreground font-black text-sm uppercase tracking-tight">{currentMenu.name}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-500 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute top-[calc(100%+8px)] left-0 menu-dropdown z-50 min-w-[200px] bg-white/95 backdrop-blur-xl border border-border shadow-premium rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-2 space-y-1">
                  {menus.map((menu) => (
                    <button
                      key={menu.id}
                      onClick={() => {
                        onMenuChange(menu.id);
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-2xl transition-all ${selectedMenu === menu.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-secondary text-foreground'
                        }`}
                    >
                      <BookOpen className={`w-4 h-4 ${selectedMenu === menu.id ? 'text-white' : 'text-primary'}`} />
                      <span className="font-bold text-sm tracking-tight">
                        {menu.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border border-border/50 p-0.5">
               <BrandingLogo variant="dark" layout="horizontal" showText={false} className="w-full h-full" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black uppercase italic tracking-tight text-foreground leading-none">{establishment?.name || 'Cardápio'}</h1>
              <p className="text-[8px] text-muted-foreground font-bold tracking-widest uppercase mt-0.5">Explorar opções</p>
            </div>
          </div>
        )}
      </div>

      {/* Mini Status Bar (Compact Redesign) */}
      {hasTable && session && (
        <div className="flex items-center gap-2 bg-secondary/40 backdrop-blur-md rounded-2xl px-2.5 sm:px-3.5 py-2 border border-border/20 animate-in fade-in zoom-in-95 duration-500 scale-95 sm:scale-100 shrink-0">
           {/* Table Label */}
           <div className="flex items-center gap-1.5 pr-2.5 border-r border-border/30">
              <span className="text-[9px] font-black italic text-primary uppercase tracking-tighter opacity-70 hidden xs:inline">Mesa</span>
              <span className="text-sm font-black text-foreground leading-none">{session.tableName || 'M1'}</span>
           </div>
           
           {/* Info Columns */}
           <div className="flex items-center gap-2 sm:gap-3.5">
              {/* Clients */}
              <div className="flex items-center gap-1">
                 <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                 <span className="text-[11px] sm:text-xs font-bold tabular-nums">{occupants.length || 1}</span>
              </div>
              
              {/* Turn Time */}
              <div className="flex items-center gap-1 min-w-[35px] sm:min-w-[45px]">
                 <Monitor className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                 <span className="text-[11px] sm:text-xs font-bold tabular-nums text-price">{turnTime}</span>
              </div>
           </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSearchClick}
          className={`p-3 rounded-2xl transition-premium active:scale-90 ${isSearchActive 
            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90' 
            : 'bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
        >
          {isSearchActive ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
