import { ArrowLeft, Trash2, Send, ChefHat, ShoppingCart as CartIcon, Minus, Plus, Check, AlertCircle, Fish, Pencil, Utensils } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useOrder } from '@/contexts/OrderContext';
import { toast } from 'sonner';
import React, { useMemo } from 'react';

interface CartViewProps {
  onBack: () => void;
  onPayment?: () => void;
}

export function CartView({ onBack, onPayment }: CartViewProps) {
  const { deductStockForOrder } = useInventory(); // Consume inventory context

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
  } = useOrder();

  const roundLimit = session?.roundLimit || 24;
  const tableName = session?.tableName || localStorage.getItem('ez_menu_table_name') || 'Mesa';

  const clientItems = cart.filter(item => item.addedBy === currentClientId);
  const otherClientItems = cart.filter(item => item.addedBy !== currentClientId);
  const allSentItems = sentOrders;

  const rodizioCovers = useMemo(() => {
    return sentOrders.filter(i => i.id.startsWith('rodizio-'));
  }, [sentOrders]);

  const alacarteSentItems = useMemo(() => {
    return sentOrders.filter(i => !i.id.startsWith('rodizio-') && i.category !== 'system');
  }, [sentOrders]);

  const rodizioTotal = useMemo(() => {
    return rodizioCovers.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [rodizioCovers]);

  const alacarteTotal = useMemo(() => {
    const cartAlacarte = cart.reduce((sum, item) => sum + (item.isRodizio ? 0 : item.price * item.quantity), 0);
    const sentAlacarte = alacarteSentItems.reduce((sum, item) => sum + (item.isRodizio ? 0 : item.price * item.quantity), 0);
    return cartAlacarte + sentAlacarte;
  }, [cart, alacarteSentItems]);

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
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors"
          >
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          </button>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
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
                        onClick={() => updateQuantity(item.id, item.addedBy, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-background rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
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
                            <button
                              onClick={() => {
                                // Logic to open customization modal in cart (could reuse ProductDetailsModal if needed)
                                // For now, we'll just indicate it's possible
                                toast.info("Funcionalidade de edição no carrinho em breve!");
                              }}
                              className="w-5 h-5 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.addedBy)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 -mt-1 -mr-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                        {item.isRodizio ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <ChefHat className="w-3 h-3" />
                            Incluso no Rodízio
                          </span>
                        ) : `R$ ${(item.price * item.quantity).toFixed(2)}`}
                      </div>
                    </div>

                    {/* Image Thumbnail */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary shrink-0 self-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
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

        {/* 2. Sent Orders (Tabs: Pending vs Delivered) */}
        {allSentItems.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <SentOrdersTabs items={allSentItems} />
          </div>
        )}

      </div>

      <div className="fixed bottom-[80px] left-0 right-0 p-4 pb-6 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-lg border-t border-border z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Price Breakdown */}
          {(rodizioTotal > 0 || alacarteTotal > 0) && (
            <div className="flex flex-col gap-1.5 px-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {rodizioCovers.length > 0 && (
                <div className="flex justify-between text-xs font-medium text-emerald-600">
                  <span className="flex items-center gap-1">
                    <Fish className="w-3 h-3" />
                    Rodízio ({rodizioCovers.length} {rodizioCovers.length === 1 ? 'pessoa' : 'pessoas'})
                  </span>
                  <span>R$ {rodizioTotal.toFixed(2)}</span>
                </div>
              )}
              {alacarteTotal > 0 && (
                <div className="flex justify-between text-xs font-medium text-primary">
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3 h-3" />
                    Itens À La Carte / Drinks
                  </span>
                  <span>R$ {alacarteTotal.toFixed(2)}</span>
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
                  <span className="text-2xl font-bold text-primary">R$ {(rodizioTotal + alacarteTotal).toFixed(2)}</span>
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
                  <div className="text-2xl font-black text-foreground tracking-tight">R$ {(rodizioTotal + alacarteTotal).toFixed(2)}</div>
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
    </div >
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: Sent Orders Tabs (Elite Style)
// ----------------------------------------------------------------------
const SentOrdersTabs = ({ items }: { items: any[] }) => {
  const [activeTab, setActiveTab] = React.useState<'pending' | 'delivered'>('pending');
  // Filter out rodizio covers and system items for list display
  const visibleItems = items.filter(i => !i.id.startsWith('rodizio-') && i.category !== 'system');
  const pendingItems = visibleItems.filter(i => i.status !== 'ready' && i.status !== 'completed');
  const deliveredItems = visibleItems.filter(i => i.status === 'ready' || i.status === 'completed');

  return (
    <div className="flex flex-col gap-6 md:max-w-xl md:mx-auto">
      {/* iOS Style Segmented Control */}
      <div className="flex p-1 bg-secondary/50 rounded-2xl mx-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2.5 ${activeTab === 'pending'
            ? 'bg-white text-destructive shadow-md scale-[1.02]'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <div className="relative">
            <ChefHat className={`w-4 h-4 ${activeTab === 'pending' ? 'animate-bounce-slow' : ''}`} />
            {pendingItems.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse border border-white" />}
          </div>
          PEDIDOS PENDENTES
        </button>
        <button
          onClick={() => setActiveTab('delivered')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2.5 ${activeTab === 'delivered'
            ? 'bg-white text-emerald-600 shadow-md scale-[1.02]'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <Check className="w-4 h-4" />
          PEDIDOS ENVIADOS
        </button>
      </div>

      {/* List Content */}
      <div className="space-y-4 min-h-[200px]">
        {activeTab === 'pending' ? (
          pendingItems.length > 0 ? (
            pendingItems.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex bg-red-50/50 border border-red-100 rounded-2xl p-3 relative overflow-hidden animate-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Status Indicator Strip */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-400" />

                <div className="flex-1 min-w-0 flex flex-col justify-between pl-3 py-1">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-base leading-tight truncate pr-2 text-foreground/90">{item.name}</h4>
                      <div className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-xs font-bold shrink-0">
                        x{item.quantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-red-500/80 uppercase tracking-wide">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Em preparo na cozinha...
                    </div>

                    {item.observation && (
                      <div className="text-xs mt-2 px-2 py-1.5 rounded-lg bg-white/60 text-muted-foreground border border-red-100/50 inline-flex items-center gap-1.5 w-fit">
                        <span className="line-clamp-1 max-w-[200px]">{item.observation}</span>
                      </div>
                    )}
                  </div>
                  {!item.isRodizio && (
                    <div className="mt-2 text-red-600 font-bold text-sm">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Image Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary shrink-0 self-center shadow-sm ml-3 border border-red-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover opacity-90"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-24 opacity-[0.1] pointer-events-none select-none grayscale">
              <div className="w-40 h-40 rounded-full border-[6px] border-current flex items-center justify-center mb-8">
                <Fish className="w-20 h-20" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter uppercase text-center leading-none">
                Art of<br />Sushi
              </h1>
            </div>
          )
        ) : (
          deliveredItems.length > 0 ? (
            deliveredItems.map((item, index) => (
              <div
                key={`del-${item.id}-${index}`}
                className="group flex flex-col bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-4 relative overflow-hidden transition-all hover:bg-emerald-50/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-gray-700 text-lg decoration-emerald-500/30">{item.name}</h4>
                  </div>
                  <span className="font-bold text-sm text-emerald-700 bg-white border border-emerald-100 px-2.5 py-1 rounded-lg">
                    x{item.quantity}
                  </span>
                </div>

                <div className="flex items-center justify-between pl-11 mt-1">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    ✓ Entregue
                  </span>
                  {item.observation && (
                    <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                      Obs: {item.observation}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
              <Check className="w-12 h-12 mb-3 opacity-20" />
              <p>Nenhum pedido entregue ainda.</p>
            </div>
          )
        )}
      </div >
    </div >
  );
};
