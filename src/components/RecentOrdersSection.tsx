import { History, Plus, Trash2 } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';

export function RecentOrdersSection() {
    const { recentOrders, addToCart, currentClientId, isRoundLimitReached, clearRecentOrders } = useOrder();

    if (recentOrders.length === 0) return null;

    return (
        <div className="px-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <History className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-base tracking-tight">Últimos Pedidos</h3>
                </div>
                <button
                    onClick={clearRecentOrders}
                    className="text-[10px] font-medium text-muted-foreground/70 flex items-center gap-1.5 hover:text-destructive transition-colors bg-secondary/30 px-2.5 py-1 rounded-full hover:bg-destructive/10"
                >
                    <Trash2 className="w-3 h-3" />
                    Limpar
                </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
                {recentOrders.map((item, idx) => (
                    <div
                        key={item.id}
                        className="flex-shrink-0 w-32 group"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="relative h-32 w-32 mb-2 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Floating Action Button */}
                            <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                <button
                                    onClick={() => addToCart(item, currentClientId)}
                                    disabled={isRoundLimitReached && item.isRodizio}
                                    className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="text-center px-1">
                            <h4 className="text-xs font-semibold leading-tight line-clamp-2 text-foreground/90">{item.name}</h4>

                            {/* Mobile Only Button (Visible if hover not supported or just generic fallback if needed, but for now relying on layout) */}
                            {/* Creating a visible button for mobile touch since hover might not work well on all devices */}
                            <div className="mt-2 flex justify-center md:hidden">
                                <button
                                    onClick={() => addToCart(item, currentClientId)}
                                    disabled={isRoundLimitReached && item.isRodizio}
                                    className="w-7 h-7 rounded-full bg-background border border-border/50 shadow-md flex items-center justify-center text-primary active:scale-90 transition-all disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
