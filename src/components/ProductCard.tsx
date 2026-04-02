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
  variant?: 'default' | 'premium';
}
export function ProductCard({ item, isAlacarte = false, onClick, hasTable = false, variant = 'default' }: ProductCardProps) {
  const { checkAvailability } = useInventory();

  const {
    cart,
    addToCart,
    updateQuantity,
    currentClientId,
    isRoundLimitReached,
    hasActiveRodizio,
    updateItemObservation
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

  const displayAsRodizio = isAlacarte ? false : item.isRodizio;
  const effectiveIsRodizio = isAlacarte ? false : (item.isRodizio && hasActiveRodizio);
  const isBlocked = isOutOfStock || !hasTable || (effectiveIsRodizio && isRoundLimitReached && quantity === 0);

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
      if (isOutOfStock) {
        toast.error('Item esgotado!');
        return;
      }
      if (isRoundLimitReached) {
        toast.error('Limite da rodada atingido!');
        return;
      }
    }

    // Rodizio safety check: can't add rodizio item if don't have the pass
    if (!isAlacarte && item.isRodizio && !hasActiveRodizio) {
      toast.error('Ative o Rodízio primeiro!', {
        description: 'Vá no Início e selecione a quantidade de pessoas para liberar os itens.',
        duration: 4000
      });
      return;
    }
    // ... (rest of handleAdd)
    setIsAnimating(true);
    const added = addToCart(item, currentClientId, isAlacarte, customNote);
    if (added) {
      toast.success(`${item.name} adicionado ao carrinho! 🛒`, {
        duration: 2000,
        position: 'top-center'
      });
      setNote(''); // Reset note after adding
      setIsNoteOpen(false);
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleConfirmNote = () => {
    if (quantity > 0) {
      updateItemObservation(targetId, currentClientId, note);
      toast.success("Observação atualizada!");
    } else {
      handleAdd(note);
    }
    setIsNoteOpen(false);
  };

  const isPremium = variant === 'premium';

  return (
    <>
      <div
        className={isPremium 
          ? `w-full flex bg-white rounded-[2.5rem] p-6 border border-black/5 mb-6 relative overflow-visible transition-premium shadow-soft ${isBlocked && (hasTable || isOutOfStock) ? 'opacity-50 grayscale' : ''}`
          : `product-card w-full flex bg-card rounded-[2rem] p-4 md:p-6 border border-border/40 mb-4 relative overflow-visible transition-premium shadow-sm ${isBlocked && (hasTable || isOutOfStock) ? 'opacity-50 grayscale' : ''}`}
      >

        {/* Left Side: Text Content */}
        <div className="flex-1 flex flex-col justify-between pr-4 min-w-0">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <h3 className={isPremium 
                ? "text-editorial text-2xl text-foreground" 
                : "font-black text-lg md:text-xl text-foreground leading-none tracking-tight"}>
                {item.name}
              </h3>
              {isLowStock && !isBlocked && (
                <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-amber-200 shrink-0 ml-2 animate-pulse">
                  Últimas un.
                </span>
              )}
            </div>
            <p className={isPremium 
              ? "text-sm text-muted-foreground/60 leading-relaxed line-clamp-2" 
              : "text-sm md:text-base text-muted-foreground/80 leading-snug line-clamp-2 italic font-medium"}>
              {item.description}
            </p>
          </div>

          <div className="flex items-end justify-between mt-6">
            {/* Price & Icons Group */}
            <div className="flex flex-col gap-3">
              {/* Price if applicable */}
              {!displayAsRodizio ? (
                <span className={isPremium 
                  ? "text-editorial text-primary text-2xl" 
                  : "font-black text-primary text-xl tracking-tight"}>
                  R$ {item.price.toFixed(2)}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-600 text-[10px] md:text-[11px] uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                    <ChefHat className="w-3 h-3 md:w-4 md:h-4" />
                    Incluso
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Observation Button */}
                {quantity > 0 && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const existingItem = cart.find(i => i.id === targetId && i.addedBy === currentClientId);
                      setNote(existingItem?.observation || '');
                      setIsNoteOpen(true); 
                    }}
                    className="h-8 px-3 rounded-xl bg-primary/10 text-primary flex items-center gap-1.5 border border-primary/20 hover:bg-primary/20 transition-all animate-in zoom-in duration-300 shadow-sm"
                    title="Adicionar observação"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Observação</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Image & Add Interaction */}
        <div className="flex flex-col items-end shrink-0 gap-3">
          {/* Image */}
          <div className={isPremium 
            ? "w-32 h-32 md:w-44 md:h-44 rounded-[2rem] overflow-hidden bg-secondary shadow-soft" 
            : "w-28 h-28 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-secondary premium-finish shadow-inner"}>
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
          </div>

          {/* Quantity/Add Controls - Positioned consistently below the image */}
          {hasTable && (
            <div className={isPremium ? "pr-1" : "pr-0"}>
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
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                </button>
              )}
            </div>
          )}
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
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground/80 pl-1">
                Observações para a cozinha:
              </label>

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
            <Button onClick={handleConfirmNote} className="bg-primary hover:bg-primary/90 text-white gap-2">
              <ChefHat className="w-4 h-4" />
              Confirmar Personalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
