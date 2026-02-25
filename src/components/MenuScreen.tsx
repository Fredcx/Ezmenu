import { useState, useMemo } from 'react';
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

interface MenuScreenProps {
  initialCategory?: string;
  initialMenu?: string;
  onNavigateToRodizio?: () => void;
  onBackToLanding?: () => void;
  hasTable?: boolean;
}

export function MenuScreen({ initialCategory, initialMenu = 'menu', onNavigateToRodizio, onBackToLanding, hasTable = false }: MenuScreenProps) {
  const [selectedMenu, setSelectedMenu] = useState(initialMenu);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || (hasTable ? 'sashimi' : 'entradas'));
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [detailsItem, setDetailsItem] = useState<MenuItem | null>(null);
  const { items: menuItems, categories: rodizioCategories, alacarteCategories } = useMenu();

  // REMOVED Redundant synchronizer that was overriding initialCategory logic

  const handleMenuChange = (menuId: string) => {
    // If switching to rodizio, trigger navigation
    if (menuId === 'rodizio' && onNavigateToRodizio) {
      onNavigateToRodizio();
      return;
    }

    setSelectedMenu(menuId);

    // Navigation logic based on header selection
    if (menuId === 'desserts') {
      setSelectedCategory('sobremesas');
    } else if (menuId === 'drinks') {
      setSelectedCategory('bebidas');
    } else if (menuId === 'wines') {
      setSelectedCategory('vinhos');
    } else if (menuId === 'alacarte' || menuId === 'menu') {
      setSelectedCategory('entradas');
    }
  };

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (item.category !== selectedCategory) return false;

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
  }, [selectedCategory, selectedSubcategory, selectedAllergens, selectedTags]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <MenuHeader
        selectedMenu={selectedMenu}
        onMenuChange={handleMenuChange}
        onFilterClick={() => setShowFilter(true)}
        onSearchClick={() => { }}
        onBack={onBackToLanding}
        hasTable={hasTable}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Category Carousel (Mobile Optimized) */}
        <CategoryCarousel
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categories={['alacarte', 'drinks', 'desserts', 'wines', 'cocktails'].includes(selectedMenu) ? alacarteCategories : rodizioCategories}
        />

        {/* Products Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status Bar */}
          {hasTable && (
            <div className="px-3 py-2">
              <StatusBar
                expanded={statusExpanded}
                onToggle={() => setStatusExpanded(!statusExpanded)}
              />
            </div>
          )}

          {/* Round Limit Warning */}
          <RoundLimitWarning />

          {/* Recent Orders */}
          <RecentOrdersSection />

          {/* Products List - Horizontal Cards Layout */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
            {filteredItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                isAlacarte={selectedMenu === 'alacarte'}
                onClick={() => setDetailsItem(item)}
                hasTable={hasTable}
              />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum item encontrado</p>
              <p className="text-sm">Tente ajustar os filtros</p>
            </div>
          )}
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
