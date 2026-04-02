import React from 'react';
import { ArrowLeft, ChefHat, Check, Fish, Utensils } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';

interface OrdersViewProps {
  onBack: () => void;
}

export function OrdersView({ onBack }: OrdersViewProps) {
  const { sentOrders } = useOrder();

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center p-4 bg-card/80 backdrop-blur-md sticky top-0 z-20 border-b border-border/50">
        <span className="font-bold text-lg tracking-tight">Meus Pedidos</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {sentOrders.length > 0 ? (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <SentOrdersTabs items={sentOrders} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <Check className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-medium text-lg">Nenhum pedido enviado</p>
            <p className="text-sm opacity-60 text-center max-w-[250px] mt-2">Os itens que você pedir irão aparecer aqui como pendentes ou enviados.</p>
          </div>
        )}
      </div>
    </div>
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
            <div className="space-y-6">
              {/* Rodizio Section */}
              {deliveredItems.filter(i => i.isRodizio || i.price === 0).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1 text-emerald-600">
                    <Fish className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Itens do Rodízio</span>
                  </div>
                  {deliveredItems.filter(i => i.isRodizio || i.price === 0).map((item, index) => (
                    <div
                      key={`del-rod-${item.id}-${index}`}
                      className="group flex flex-col bg-emerald-50/20 border border-emerald-100/30 rounded-2xl p-4 relative overflow-hidden transition-all hover:bg-emerald-50/40"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100/50 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-emerald-600" />
                          </div>
                          <h4 className="font-bold text-gray-700 text-base">{item.name}</h4>
                        </div>
                        <span className="font-bold text-sm text-emerald-700 bg-white border border-emerald-100 px-2 py-0.5 rounded-lg">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-11">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                          ✓ Entregue (R$ 0,00)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* A La Carte Section */}
              {deliveredItems.filter(i => !i.isRodizio && i.price > 0).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1 text-primary">
                    <Utensils className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Bebidas & À La Carte</span>
                  </div>
                  {deliveredItems.filter(i => !i.isRodizio && i.price > 0).map((item, index) => (
                    <div
                      key={`del-ala-${item.id}-${index}`}
                      className="group flex flex-col bg-slate-50 border border-slate-200 rounded-2xl p-4 relative overflow-hidden transition-all hover:bg-slate-100/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                          <h4 className="font-bold text-gray-700 text-base">{item.name}</h4>
                        </div>
                        <span className="font-bold text-sm text-primary bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-11">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
