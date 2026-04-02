import { X } from 'lucide-react';
import { allergensList, tagsList } from '@/data/menuData';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAllergens: string[];
  selectedTags: string[];
  onToggleAllergen: (allergen: string) => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

export function FilterModal({
  isOpen,
  onClose,
  selectedAllergens,
  selectedTags,
  onToggleAllergen,
  onToggleTag,
  onClear,
}: FilterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-popover rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Filtro</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Allergens */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Alérgenos</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Selecione os pratos a serem filtrados
            </p>
            <div className="flex flex-wrap gap-2">
              {allergensList.map((allergen) => (
                <button
                  key={allergen}
                  onClick={() => onToggleAllergen(allergen)}
                  className={`filter-chip ${
                    selectedAllergens.includes(allergen) ? 'active' : ''
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-semibold mb-2">Outras etiquetas de prato</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Selecione os pratos a serem filtrados
            </p>
            <div className="flex flex-wrap gap-2">
              {tagsList.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={`filter-chip ${
                    selectedTags.includes(tag) ? 'active' : ''
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={onClear}
            className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium"
          >
            Limpar
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
