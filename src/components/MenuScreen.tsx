import { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { MenuHeader } from './MenuHeader';
import { CategoryCarousel } from './CategoryCarousel';
import { StatusBar } from './StatusBar';
import { ProductCard } from './ProductCard';
import { FilterModal } from './FilterModal';
import { RecentOrdersSection } from './RecentOrdersSection';
import { RoundLimitWarning } from './RoundLimitWarning';
import { useMenu } from '@/contexts/MenuContext';
import { MenuItem } from '@/contexts/OrderContext';
import { ProductDetailsModal } from './ProductDetailsModal';
import { BrandingLogo } from './BrandingLogo';

interface MenuScreenProps {
  initialCategory?: string;
  initialMenu?: string;
  onNavigateToRodizio?: () => void;
  onBackToLanding?: () => void;
  hasTable?: boolean;
  variant?: 'default' | 'premium';
}

export function MenuScreen({ initialCategory, initialMenu = 'menu', onNavigateToRodizio, onBackToLanding, hasTable = false, variant = 'default' }: MenuScreenProps) {
  const [selectedMenu, setSelectedMenu] = useState(initialMenu);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || (hasTable ? 'sashimi' : 'entradas'));
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [detailsItem, setDetailsItem] = useState<MenuItem | null>(null);
  const { items: menuItems, categories: rodizioCategories, alacarteCategories, establishment } = useMenu();

  // REMOVED Redundant synchronizer that was overriding initialCategory logic

  const handleMenuChange = (menuId: string) => {
    // If switching to rodizio, trigger navigation
    if (menuId === 'rodizio' && onNavigateToRodizio) {
      onNavigateToRodizio();
      return;
    }

    setSelectedMenu(menuId);

    // Give the DOM a moment to update categories if we switched modes
    setTimeout(() => {
        // Find if this menuId has a mapped categoryName in the admin settings
        const settingsSections = establishment?.settings?.menu_sections;
        const configSection = Array.isArray(settingsSections) ? settingsSections.find((s: any) => s.id === menuId) : null;
        
        let targetName = configSection?.categoryName || '';

        // Fallback to defaults if no custom mapping exists
        if (!targetName) {
            if (menuId === 'desserts') targetName = 'sobremesa';
            else if (menuId === 'drinks') targetName = 'bebida';
            else if (menuId === 'wines') targetName = 'vinho';
            else if (menuId === 'cocktails') targetName = 'drink';
        }

        if (targetName) {
            const normalizedTargetName = targetName.toLowerCase().replace(/s$/, ''); // Remove trailing 's' if any
            const targetCat = alacarteCategories.find(c => 
                c.name.toLowerCase().includes(normalizedTargetName)
            );
            if (targetCat) {
                handleCategorySelect(targetCat.id);
            }
        } else if (['alacarte', 'menu'].includes(menuId) && alacarteCategories.length > 0) {
            handleCategorySelect(alacarteCategories[0].id);
        }
    }, 100);
  };

  const isAlacarteMode = ['alacarte', 'menu', 'drinks', 'desserts', 'wines', 'cocktails'].includes(selectedMenu);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(query) && !item.description?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Subcategory filter
      if (selectedSubcategory && item.subcategory !== selectedSubcategory) return false;

      // Allergen filter (exclude items with selected allergens)
      if (selectedAllergens.length > 0) {
        const hasAllergen = selectedAllergens.some(a =>
          item.allergens?.includes(a)
        );
        if (hasAllergen) return false;
      }

      // Tag filter (include items with selected tags)
      if (selectedTags.length > 0) {
        const hasTag = selectedTags.some(t =>
          item.tags?.includes(t)
        );
        if (!hasTag) return false;
      }

      return true;
    });
  }, [selectedCategory, selectedSubcategory, selectedAllergens, selectedTags, searchQuery]);

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedAllergens([]);
    setSelectedTags([]);
  };

  const currentCategories = (isAlacarteMode ? alacarteCategories : rodizioCategories).filter(cat => !cat.name.toUpperCase().includes('SISTEMA'));

  const isScrollingTo = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  // Auto-scroll on mount if initialCategory was passed (e.g. from Landing Screen)
  useEffect(() => {
    if (initialCategory && currentCategories.length > 0) {
        const target = currentCategories.find(c => 
            c.id === initialCategory || 
            c.name.toLowerCase().includes(initialCategory.toLowerCase())
        );
        if (target) {
            setTimeout(() => {
                handleCategorySelect(target.id);
            }, 100);
        }
    }
  }, [initialCategory, currentCategories.length]);

  // Sync scroll position with selected category via IntersectionObserver
  useEffect(() => {
    const container = document.getElementById('menu-scroll-container');
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingTo.current) return;
        
        const visibleEntries = entries.filter(e => e.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const id = visibleEntries[0].target.id.replace('category-', '');
          setSelectedCategory(id);
        }
      },
      { root: container, rootMargin: '-10px 0px -70% 0px', threshold: 0 }
    );

    const sections = currentCategories.map(c => document.getElementById(`category-${c.id}`)).filter(Boolean);
    sections.forEach(s => observer.observe(s!));

    return () => observer.disconnect();
  }, [currentCategories, filteredItems, selectedMenu]);

  const handleCategorySelect = (categoryId: string) => {
    isScrollingTo.current = true;
    if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    scrollTimeout.current = window.setTimeout(() => {
        isScrollingTo.current = false;
    }, 1000);

    setSelectedCategory(categoryId);
    const element = document.getElementById(`category-${categoryId}`);
    const container = document.getElementById('menu-scroll-container');
    if (element && container) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <MenuHeader
        selectedMenu={selectedMenu}
        onMenuChange={handleMenuChange}
        onFilterClick={() => setShowFilter(true)}
        onSearchClick={() => {
            setShowSearch(!showSearch);
            if (showSearch) setSearchQuery('');
        }}
        isSearchActive={showSearch}
        onBack={onBackToLanding}
        hasTable={hasTable}
      />

      {showSearch && (
        <div className="px-5 py-3 bg-background border-b border-border/40 animate-in slide-in-from-top-2 z-30 relative shadow-sm">
            <div className="relative flex items-center max-w-lg mx-auto w-full">
                <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar pratos ou bebidas..."
                    className="w-full bg-secondary/50 border border-border/50 rounded-xl py-2.5 pl-9 pr-4 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-semibold placeholder:font-medium"
                    autoFocus
                />
            </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-[1800px] mx-auto w-full group/menu">
        {/* Category Carousel (Mobile: Top, Desktop: Left Sidebar) */}
        <div className="md:w-64 lg:w-72 xl:w-80 md:h-full md:border-r border-white/5 bg-background shadow-2xl z-20">
          <CategoryCarousel
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            categories={currentCategories}
            vertical={true}
          />
        </div>

        {/* Products Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Products List - Vertical Continuous Layout */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 pb-32 no-scrollbar scroll-smooth" id="menu-scroll-container">
            <div className="max-w-4xl mx-auto space-y-12">
              {currentCategories.map(category => {
                  const catItems = filteredItems.filter(i => i.category === category.id);
                  if (catItems.length === 0) return null;
                  
                  return (
                      <div key={category.id} id={`category-${category.id}`} className="scroll-mt-6 md:scroll-mt-10 overflow-hidden">
                          <div className="flex items-center gap-3 mb-5 px-2">
                             <h3 className="text-xl font-black uppercase text-primary tracking-tight drop-shadow-sm">{category.name}</h3>
                             <div className="h-[2px] flex-1 bg-primary/60" />
                          </div>
                          
                          <div className="space-y-4">
                              {catItems.map((item) => (
                                <ProductCard
                                  key={item.id}
                                  item={item}
                                  isAlacarte={isAlacarteMode}
                                  onClick={() => setDetailsItem(item)}
                                  hasTable={hasTable}
                                  variant={variant}
                                />
                              ))}
                          </div>
                      </div>
                  );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-24 text-muted-foreground">
                <p className="text-xl font-bold">Nenhum item encontrado</p>
                <p className="text-sm opacity-60">Tente ajustar a busca ou limpar os filtros</p>
              </div>
            )}

            {/* Footer Branding */}
            {filteredItems.length > 0 && (
              <div className="mt-16 flex flex-col items-center justify-center select-none pb-20">
                <BrandingLogo variant="dark" className="w-[180px] h-[90px]" showText={false} skipCustomization={true} />
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        selectedAllergens={selectedAllergens}
        selectedTags={selectedTags}
        onToggleAllergen={toggleAllergen}
        onToggleTag={toggleTag}
        onClear={clearFilters}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        item={detailsItem}
        isOpen={!!detailsItem}
        onClose={() => setDetailsItem(null)}
        isAlacarte={selectedMenu === 'alacarte'}
      />
    </div >
  );
}
