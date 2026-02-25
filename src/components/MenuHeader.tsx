import { BookOpen, Filter, Search, ChevronDown, ArrowLeft, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categories } from '@/data/menuData';
import { useState } from 'react';
import { useOrder } from '@/contexts/OrderContext';

interface MenuHeaderProps {
  selectedMenu: string;
  onMenuChange: (menuId: string) => void;
  onFilterClick: () => void;
  onSearchClick: () => void;
  onBack?: () => void;
  hasTable?: boolean;
}

export function MenuHeader({
  selectedMenu,
  onMenuChange,
  onFilterClick,
  onSearchClick,
  onBack,
  hasTable = true
}: MenuHeaderProps) {
  const { restaurantType } = useOrder();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

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
    <div className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 glass border-b border-border/40 transition-all duration-300">
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
              className="flex items-center gap-2.5 bg-secondary/80 backdrop-blur-sm hover:bg-secondary border border-border/50 rounded-2xl px-5 py-2.5 transition-premium shadow-sm active:scale-95"
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
          <div className="flex flex-col">
            <h1 className="text-lg font-black uppercase italic tracking-tight text-foreground">Cardápio</h1>
            <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Explorar todas as opções</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onFilterClick}
          className="p-3 bg-secondary/50 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-premium active:scale-90"
        >
          <Filter className="w-5 h-5" />
        </button>
        <button
          onClick={onSearchClick}
          className="p-3 bg-secondary/50 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-premium active:scale-90"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
