import { Plus, Minus, ChefHat, AlertCircle, Pencil } from 'lucide-react';
import { MenuItem, useOrder } from '@/contexts/OrderContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ProductCardProps {
  item: MenuItem;
  isAlacarte?: boolean;
  onClick?: () => void;
  hasTable?: boolean;
}
export function ProductCard({ item, isAlacarte = false, onClick, hasTable = false }: ProductCardProps) {
  const { checkAvailability } = useInventory();

  const {
    cart,
    addToCart,
    updateQuantity,
    currentClientId,
    isRoundLimitReached
  } = useOrder();

  const [isAnimating, setIsAnimating] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  const targetId = isAlacarte ? `${item.id}-alacarte` : item.id;

  // We are now matching by ID only for "quantity display" purposes on the card,
  // but be aware that items with DIFFERENT notes will be separate lines in cart.
  // Showing total quantity of this item regardless of notes:
  const quantity = cart
    .filter(i => i.id === targetId && i.addedBy === currentClientId)
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const availability = checkAvailability(item.code);
  const isOutOfStock = availability === 'out_of_stock';
  const isLowStock = availability === 'low_stock';

  const isBlocked = (item.isRodizio && isRoundLimitReached && quantity === 0) || isOutOfStock || !hasTable;

  const handleRemove = () => {
    const itemInCart = cart.find(i => i.id === targetId && i.addedBy === currentClientId);
    if (itemInCart) {
      updateQuantity(targetId, currentClientId, itemInCart.quantity - 1);
    }
  };

  const handleAdd = (customNote?: string) => {
    if (isBlocked) {
      if (!hasTable) {
        toast.error('Escaneie o QR Code da mesa para fazer o pedido!', {
          description: 'Você está no modo visualização.',
          duration: 3000
        });
        return;
      }
      if (isOutOfStock) toast.error('Item esgotado!');
      else if (isRoundLimitReached) toast.error('Limite da rodada atingido!');
      return;
    }
    // ... (rest of handleAdd)
    setIsAnimating(true);
    addToCart(item, currentClientId, isAlacarte, customNote);
    toast.success(`${item.name} adicionado ao carrinho! 🛒`, {
      duration: 2000,
      position: 'top-center'
    });
    setTimeout(() => setIsAnimating(false), 300);
    setNote(''); // Reset note after adding
    setIsNoteOpen(false);
  };

  return (
    <>
      <div
        onClick={onClick}
        className={`product-card w-full flex bg-card rounded-[2rem] p-4 border border-border/40 mb-4 relative overflow-visible transition-premium hover:shadow-premium hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer shadow-sm ${isBlocked ? 'opacity-50 grayscale' : ''}`}
      >

        {/* Left Side: Text Content */}
        <div className="flex-1 flex flex-col justify-between pr-4 min-w-0">
          <div className="space-y-1.5">
            <div className="flex justify-between items-start">
              <h3 className="font-black text-lg text-foreground leading-none tracking-tight">
                {item.name}
              </h3>
              {isLowStock && !isBlocked && (
                <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-amber-200 shrink-0 ml-2 animate-pulse">
                  Últimas un.
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground/80 leading-snug line-clamp-2 italic font-medium">
              {item.description}
            </p>
          </div>

          <div className="flex items-end justify-between mt-4">
            {/* Price & Icons Group */}
            <div className="flex flex-col gap-2">
              {/* Price if applicable */}
              {(!item.isRodizio || isAlacarte) && (
                <span className="font-black text-primary text-lg tracking-tight">
                  R$ {item.price.toFixed(2)}
                </span>
              )}

              <div className="flex items-center gap-2">
                {/* Icons (Allergens/Dietary) */}
                {item.allergens && item.allergens.length > 0 && (
                  <div className="flex gap-1">
                    {item.allergens.slice(0, 4).map((allergen, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-xl bg-secondary/50 text-muted-foreground flex items-center justify-center border border-border/30"
                        title={allergen}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit Button (if customizable) */}
                <button
                  onClick={(e) => { e.stopPropagation(); setIsNoteOpen(true); }}
                  className="w-6 h-6 rounded-xl bg-secondary text-primary flex items-center justify-center border border-primary/10 hover:bg-primary hover:text-white transition-premium shadow-sm shadow-primary/5 active:scale-90"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Image & Add Interaction */}
        <div className="relative shrink-0">
          {/* Image */}
          <div className="w-28 h-28 rounded-2xl overflow-hidden bg-secondary premium-finish shadow-inner">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
            />
          </div>

          {/* Floating Quantity/Add Controls */}
          <div className="absolute -bottom-1 -right-1">
            {quantity > 0 ? (
              <div className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl border border-border shadow-premium overflow-hidden h-10 animate-in slide-in-from-right-2 duration-300">
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                  className="w-10 h-10 flex items-center justify-center text-primary hover:bg-red-50 transition-premium active:scale-90"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-6 text-center">
                  <span className="font-black text-sm tabular-nums">{quantity}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                  disabled={isBlocked}
                  className="w-10 h-10 flex items-center justify-center bg-primary text-white hover:brightness-110 transition-premium shadow-lg shadow-primary/20 active:scale-90"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                disabled={isBlocked}
                className="w-11 h-11 rounded-2xl bg-white border border-border/60 shadow-premium flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-premium active:scale-90 group"
              >
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Note Dialog */}
      <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ChefHat className="w-6 h-6 text-primary" />
              Do seu jeito!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Empathetic Message */}
            <div className="bg-secondary/20 p-4 rounded-xl space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2 text-primary">
                <span className="text-lg">🤝</span>
                Nossa cozinha cuida de você
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tem alguma alergia, intolerância ou preferência? Fique à vontade para nos contar.
                Queremos que sua experiência seja segura e deliciosa.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium pl-1">
                Observações para a cozinha:
              </label>

              {/* Enhanced Allergen Warning */}
              {item.allergens && item.allergens.length > 0 && (
                <div className="flex items-start gap-3 text-amber-700 text-sm bg-amber-50 p-3 rounded-lg border border-amber-100 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Atenção aos alérgenos:</span>
                    Este prato contém {item.allergens.join(', ')}.
                  </div>
                </div>
              )}

              <Textarea
                placeholder="Ex: 'Sou alérgico a camarão', 'Sem cebolinha', 'Ponto bem passado'..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="resize-none min-h-[100px] text-base focus-visible:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsNoteOpen(false)} className="hover:bg-secondary/50">
              Cancelar
            </Button>
            <Button onClick={() => handleAdd(note)} className="bg-primary hover:bg-primary/90 text-white gap-2">
              <ChefHat className="w-4 h-4" />
              Confirmar Personalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
