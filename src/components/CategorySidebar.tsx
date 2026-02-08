import { categories as defaultCategories, subcategories } from '@/data/menuData';

interface CategorySidebarProps {
  selectedCategory: string;
  selectedSubcategory: string | null;
  onSelectCategory: (categoryId: string) => void;
  onSelectSubcategory: (subcategory: string | null) => void;
  categories?: typeof defaultCategories;
}

export function CategorySidebar({
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  onSelectSubcategory,
  categories = defaultCategories,
}: CategorySidebarProps) {
  const subs = subcategories[selectedCategory] || [];

  return (
    <div className="w-28 bg-sidebar flex flex-col h-full py-4 overflow-y-auto no-scrollbar border-r border-border/30">
      <div className="flex flex-col gap-1 px-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              onSelectCategory(category.id);
              onSelectSubcategory(null);
            }}
            className={`
              relative py-4 px-2 rounded-2xl transition-premium group
              ${selectedCategory === category.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}
            `}
          >
            <span className={`text-[10px] uppercase font-black tracking-widest leading-none block transition-transform group-active:scale-95`}>
              {category.name}
            </span>
          </button>
        ))}
      </div>

      {/* Subcategories - Removed as per request */}
      {/* 
      {subs.length > 0 && (
        <div className="mt-4 border-t border-border pt-2">
          ...
        </div>
      )}
      */}
    </div>
  );
}
