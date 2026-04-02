import { ArrowLeft, Trash2, Send, ChefHat, ShoppingCart as CartIcon, Minus, Plus, Check, AlertCircle, Fish, Pencil, Utensils } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useOrder } from '@/contexts/OrderContext';
import { toast } from 'sonner';
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CartViewProps {
  onBack: () => void;
  onPayment?: () => void;
}

export function CartView({ onBack, onPayment }: CartViewProps) {
  const { deductStockForOrder } = useInventory(); // Consume inventory context

  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [activeItemId, setActiveItemId] = useState<{id: string, addedBy: string} | null>(null);

  const {
    cart,
    sentOrders,
    totalPrice,
    updateQuantity,
    removeFromCart,
    currentClientId,
    sendOrder,
    clearCart,
    session,
    roundItemsCount,
    hasActiveRodizio,
    updateItemObservation
  } = useOrder();

  const roundLimit = session?.roundLimit || 24;
  const tableName = session?.tableName || localStorage.getItem('ez_menu_table_name') || 'Mesa';

  const clientItems = cart.filter(item => item.addedBy === currentClientId);
  const otherClientItems = cart.filter(item => item.addedBy !== currentClientId);
  const allSentItems = sentOrders;

  const rodizioCovers = useMemo(() => {
    return sentOrders.filter(i => i.code.startsWith('SYS01') || i.code.startsWith('SYS02'));
  }, [sentOrders]);

  const alacarteSentItems = useMemo(() => {
    return sentOrders.filter(i => !i.code.startsWith('SYS'));
  }, [sentOrders]);

  const rodizioTotal = useMemo(() => {
    return rodizioCovers.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [rodizioCovers]);

  const alacarteSentTotal = useMemo(() => {
    return alacarteSentItems.reduce((sum, item) => sum + (item.isRodizio ? 0 : item.price * item.quantity), 0);
  }, [alacarteSentItems]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.isRodizio ? 0 : item.price * item.quantity), 0);
  }, [cart]);

  const tableTotal = rodizioTotal + alacarteSentTotal + cartTotal;

  const handleSend = () => {
    if (cart.length > 0) {
      sendOrder();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header - Fixed & Glassmorphic on scroll (if needed, but simple card here) */}
      <div className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-md sticky top-0 z-20 border-b border-border/50">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg tracking-tight">Mesa {tableName}</span>
        <div className="w-10" />
      </div>

      {/* Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-48">

        {/* Empty State */}
        {cart.length === 0 && sentOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
              <CartIcon className="w-10 h-10 opacity-30" />
            </div>
            <p className="text-xl font-medium text-foreground">Seu carrinho está vazio</p>
            <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">Navegue pelo menu e adicione pratos deliciosos para começar.</p>
          </div>
        )}

        {/* 1. New Orders (Pending Calculation) */}
        {cart.length > 0 && (
          <div className="space-y-4">
            {(clientItems.length > 0) && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-4 pl-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Novo Pedido</h2>
                </div>

                {clientItems.map((item) => (
                  <div
                    key={`${item.id}-${item.addedBy}`}
                    className="group relative bg-card rounded-2xl p-4 flex gap-4 border border-border shadow-sm hover:shadow-md transition-all mb-3 md:max-w-xl md:mx-auto"
                  >
                    {/* Quantity Controls - Vertical for easy touch on mobile */}
                    <div className="flex flex-col items-center justify-center gap-1 bg-secondary/30 rounded-xl p-1 h-fit self-center">
                      <button
                        onClick={() => {
                          if (item.quantity === 1) {
                            removeFromCart(item.id, item.addedBy);
                          } else {
                            updateQuantity(item.id, item.addedBy, item.quantity - 1);
                          }
                        }}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${item.quantity === 1 ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-background'}`}
                      >
                        {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="font-bold text-sm min-w-[1.5rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.addedBy, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <h4 className="font-bold text-base leading-tight truncate">{item.name}</h4>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>

                        {item.observation && (
                          <div className={`text-xs mt-2 px-2 py-1.5 rounded-lg inline-flex items-center gap-1.5 w-fit
                                          ${item.observation.toLowerCase().includes('alergia') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-secondary text-muted-foreground'}
                                      `}>
                            {item.observation.toLowerCase().includes('alergia') && <AlertCircle className="w-3 h-3" />}
                            <span className="line-clamp-1 max-w-[200px]">{item.observation}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-primary font-bold text-sm">
                        {(item.isRodizio && hasActiveRodizio) ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <ChefHat className="w-3 h-3" />
                            Incluso no Rodízio
                          </span>
                        ) : `R$ ${(item.price * item.quantity).toFixed(2)}`}
                      </div>
                    </div>

                    {/* Image Thumbnail */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary shrink-0 self-center relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNote(item.observation || '');
                          setActiveItemId({ id: item.id, addedBy: item.addedBy });
                          setIsNoteOpen(true);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-white/95 backdrop-blur-sm rounded-md shadow-sm flex items-center justify-center text-primary/80 hover:text-primary transition-colors border border-black/5"
                        title="Adicionar ou editar observação"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {otherClientItems.length > 0 && (
              <div className="opacity-75 grayscale-[30%] scale-95 origin-top">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 pl-1">Outros Dispositivos</div>
                {otherClientItems.map((item) => (
                  <div key={`${item.id}-${item.addedBy}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl mb-2 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                        {item.quantity}x
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Cliente {item.addedBy.split('-')[1] || '?'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-lg border-t border-border z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Price Breakdown */}
          {(rodizioTotal > 0 || alacarteSentTotal > 0) && (
            <div className="flex flex-col gap-1.5 px-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {rodizioCovers.length > 0 && (
                <div className="flex justify-between text-xs font-medium text-emerald-600">
                  <span className="flex items-center gap-1">
                    <Fish className="w-3 h-3" />
                    Rodízio ({rodizioCovers.length} {rodizioCovers.length === 1 ? 'pessoa' : 'pessoas'})
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('ez-menu-nav', { detail: 'rodizio' }))}
                      className="ml-2 text-[10px] font-black uppercase tracking-wider underline opacity-40 hover:opacity-100 hover:text-primary transition-all decoration-2 underline-offset-2 flex items-center gap-1"
                    >
                      Alterar
                    </button>
                  </span>
                  <span>R$ {rodizioTotal.toFixed(2)}</span>
                </div>
              )}
              {alacarteSentTotal > 0 && (
                <div className="flex justify-between text-xs font-medium text-primary">
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3 h-3" />
                    Itens da Conta (A La Carte)
                  </span>
                  <span>R$ {alacarteSentTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-border/50 my-1" />
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {cart.length > 0 ? (
              <>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Acumulado</span>
                  <span className="text-2xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleSend}
                  className="flex-1 max-w-[200px] h-14 bg-primary text-primary-foreground text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Pedir</span>
                  <CartIcon className="w-5 h-5 fill-current opacity-50" />
                </button>
              </>
            ) : (
              <div className="w-full flex justify-between items-center gap-3">
                <div className="shrink-0 flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total da Mesa</span>
                  <div className="text-2xl font-black text-foreground tracking-tight">R$ {tableTotal.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={onBack} className="px-4 py-3 rounded-xl bg-secondary/80 hover:bg-secondary font-semibold text-xs transition-colors">
                    Voltar
                  </button>
                  <button
                    onClick={onPayment}
                    className="group relative px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xl shadow-red-600/20 hover:shadow-red-600/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      <span>FECHAR CONTA</span>
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
        <DialogContent className="w-[90vw] sm:max-w-md rounded-3xl sm:rounded-[2rem]">
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
                className="resize-none min-h-[100px] text-base focus-visible:ring-primary rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsNoteOpen(false)} className="hover:bg-secondary/50">
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if(activeItemId) {
                  updateItemObservation(activeItemId.id, activeItemId.addedBy, note);
                  toast.success("Observação atualizada!");
                  setIsNoteOpen(false);
                }
              }} 
              className="bg-primary hover:bg-primary/90 text-white gap-2"
            >
              <ChefHat className="w-4 h-4" />
              Confirmar Personalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}


