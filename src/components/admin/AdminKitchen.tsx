import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ChefHat, Bell, UtensilsCrossed, Wine, Fish, Trash2, User, CreditCard, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderItem } from '@/contexts/OrderContext';
import { supabase } from '@/lib/supabase';

interface Order {
    id: string; // Changed from number to string for UUID
    timestamp: number;
    items: OrderItem[];
    status: string;
    tableId?: string;
    completedAt?: number;
}

import { useInventory } from '@/contexts/InventoryContext';

export function AdminKitchen() {
    const { deductStockForOrder } = useInventory();
    const [orders, setOrders] = useState<Order[]>([]);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [activeTab, setActiveTab] = useState("all");

    const fetchOrders = async () => {
        try {
            const { data: ordersData, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        menu_items (
                            id,
                            code,
                            name,
                            station,
                            is_rodizio
                        )
                    )
                `)
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const processedOrders: Order[] = (ordersData || []).map(o => ({
                id: o.id,
                timestamp: new Date(o.created_at).getTime(),
                status: o.status,
                tableId: o.table_id,
                completedAt: o.completed_at ? new Date(o.completed_at).getTime() : undefined,
                items: (o.order_items || []).map((oi: any) => ({
                    id: oi.id,
                    dbMenuItemId: oi.item_id, // Changed from menu_item_id
                    code: oi.menu_items?.code || '',
                    name: oi.menu_items?.name || '',
                    quantity: oi.quantity,
                    status: oi.status,
                    observation: oi.observation,
                    station: oi.menu_items?.station,
                    price: Number(oi.price), // Changed from price_at_order
                    isRodizio: oi.menu_items?.is_rodizio
                }))
            }));

            setOrders(processedOrders);
        } catch (error) {
            console.error("Error fetching orders in KDS:", error);
        }
    };

    useEffect(() => {
        fetchOrders();

        const ordersChannel = supabase.channel('kds_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchOrders())
            .subscribe();

        const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);

        return () => {
            supabase.removeChannel(ordersChannel);
            clearInterval(timerInterval);
        };
    }, []);

    const updateItemStatus = async (orderId: string, itemIds: string[], newStatus: 'ready') => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            const itemsToDeduct: { idOrCode: string; quantity: number }[] = [];

            // Update item status in Supabase
            const { error: itemError } = await supabase
                .from('order_items')
                .update({ status: newStatus })
                .in('id', itemIds);

            if (itemError) throw itemError;

            // Collect items for stock deduction
            itemIds.forEach(id => {
                const item = order.items.find(i => i.id === id);
                if (item && newStatus === 'ready') {
                    itemsToDeduct.push({ idOrCode: item.code, quantity: item.quantity });
                }
            });

            // Check if all items in the order are ready
            const updatedItems = order.items.map(i => itemIds.includes(i.id) ? { ...i, status: newStatus as any } : i);
            const allReady = updatedItems.every(i => i.status === 'ready');

            if (allReady) {
                await supabase
                    .from('orders')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', orderId);
            } else {
                await supabase
                    .from('orders')
                    .update({ status: 'preparing' })
                    .eq('id', orderId);
            }

            if (itemsToDeduct.length > 0) {
                deductStockForOrder(itemsToDeduct);
            }

            toast.success("Status atualizado!");
        } catch (error) {
            console.error("Error updating status in KDS:", error);
            toast.error("Erro ao atualizar status");
        }
    };

    const clearHistory = async () => {
        if (!confirm("Tem certeza que deseja limpar todo o histórico de pedidos concluídos? (Eles serão arquivados)")) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'archived' })
                .eq('status', 'completed');

            if (error) throw error;
            toast.success("Histórico arquivado!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao limpar histórico");
        }
    };

    const Timer = ({ startTime, completedAt }: { startTime: number, completedAt?: number }) => {
        const [elapsed, setElapsed] = useState(0);

        useEffect(() => {
            if (completedAt) {
                setElapsed(completedAt - startTime);
                return;
            }
            // Initial set
            setElapsed(Date.now() - startTime);

            const interval = setInterval(() => {
                setElapsed(Date.now() - startTime);
            }, 1000);
            return () => clearInterval(interval);
        }, [startTime, completedAt]);

        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        // Style check
        let colorClass = "text-muted-foreground";
        if (!completedAt) {
            if (minutes > 30) colorClass = "text-red-600 font-bold animate-pulse";
            else if (minutes > 15) colorClass = "text-yellow-600 font-bold";
            else colorClass = "text-emerald-600 font-bold";
        } else {
            colorClass = "text-muted-foreground/70";
        }

        return (
            <span className={`text-xs flex items-center gap-1 ${colorClass}`}>
                <Clock className="w-3 h-3" />
                {minutes}m {seconds}s
            </span>
        );
    };

    const getCardColor = (startTime: number, completedAt?: number) => {
        const diff = (completedAt || Date.now()) - startTime;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 10) return 'border-green-500';
        if (minutes < 20) return 'border-yellow-500';
        return 'border-red-500';
    };

    const filterItems = (items: OrderItem[], tab: string) => {
        if (tab === 'all') return items;
        return items.filter(item => item.station === tab);
    };

    const RenderOrders = ({ tab }: { tab: string }) => {
        const relevantOrders = orders.filter(order => {
            if (tab === 'completed') {
                return order.status === 'completed';
            }
            if (order.status === 'completed' || order.status === 'archived') return false;

            const items = filterItems(order.items, tab);
            return items.length > 0;
        }).sort((a, b) => b.timestamp - a.timestamp);

        if (relevantOrders.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                    <ChefHat className="w-16 h-16 mb-4" />
                    <p>Nenhum pedido na fila para esta estação.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {relevantOrders.map((order) => {
                    const borderColor = getCardColor(order.timestamp, order.completedAt);
                    const stationItems = filterItems(order.items, tab);

                    // Check if all displayed items are done
                    const isStationDone = stationItems.every(i => i.status === 'ready');

                    if (isStationDone && tab !== 'all') {
                        // If separate station view and done, maybe hide or show differently?
                        // User wants to see "Done" items? Usually KDS removes them.
                        // Let's keep them but dim.
                    }

                    return (
                        <div key={order.id} className={`bg-card rounded-xl shadow-sm border-l-8 flex flex-col ${borderColor} ${isStationDone ? 'opacity-60 bg-stone-100' : ''}`}>
                            {/* Header */}
                            <div className="p-4 border-b pb-2 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg font-bold">Mesa {order.tableId}</span>
                                        {((order.completedAt || Date.now()) - order.timestamp) / 60000 >= 20 && <span className="animate-pulse text-red-600 font-bold text-xs">ATRASADO</span>}
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground text-sm font-mono">
                                        <Timer startTime={order.timestamp} completedAt={order.completedAt} />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-muted-foreground block">Pedido #{order.id.slice(0, 4)}</span>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="p-4 flex-1 space-y-3">
                                {stationItems.map((item, idx) => (
                                    <div key={idx} className={`flex flex-col text-sm ${item.status === 'ready' ? 'opacity-50' : ''}`}>
                                        <div className={`flex justify-between items-center ${item.status === 'ready' ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-secondary px-2 py-0.5 rounded text-xs font-bold">{item.quantity}x</span>
                                                <span>{item.name}</span>
                                            </div>
                                        </div>
                                        {item.observation && (
                                            <div className={`mt-1 ml-8 text-xs p-1 rounded-md flex items-start gap-1 ${item.observation.toLowerCase().includes('alergia') || item.observation.toLowerCase().includes('alérgico')
                                                ? 'bg-red-100 text-red-700 font-bold border border-red-200 animate-pulse'
                                                : 'bg-yellow-50 text-yellow-800'
                                                }`}>
                                                {item.observation.toLowerCase().includes('alergia') || item.observation.toLowerCase().includes('alérgico') ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-lg leading-none">⚠️</span>
                                                        <span className="uppercase">{item.observation}</span>
                                                    </div>
                                                ) : (
                                                    <span>📝 {item.observation}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="p-3 bg-secondary/30 mt-auto">
                                {!isStationDone ? (
                                    <button
                                        onClick={() => updateItemStatus(order.id, stationItems.map(i => i.id), 'ready')}
                                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-bold shadow-sm transition-all active:scale-95"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        {tab === 'all' ? 'Concluir Pedido' : 'Pronto na Estação'}
                                    </button>
                                ) : (
                                    <div className="w-full text-center py-2 text-green-600 font-bold flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Concluído
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };



    const [serviceRequests, setServiceRequests] = useState<{ id: string, type: 'waiter' | 'machine', status: 'pending' | 'completed', timestamp: number, tableId: string, userName?: string }[]>([]);

    const fetchServiceRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('service_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setServiceRequests((data || []).map(r => ({
                id: r.id,
                type: r.type,
                status: r.status,
                timestamp: new Date(r.created_at).getTime(),
                tableId: r.table_id,
                userName: r.user_name
            })));
        } catch (e) {
            console.error("Failed to fetch service requests", e);
        }
    };

    useEffect(() => {
        fetchServiceRequests();
        const channel = supabase.channel('service_requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => fetchServiceRequests())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const completeRequest = async (id: string) => {
        try {
            const { error } = await supabase
                .from('service_requests')
                .update({ status: 'completed' })
                .eq('id', id);

            if (error) throw error;
            toast.success("Solicitação atendida!");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao atender solicitação");
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ChefHat className="w-8 h-8 text-primary" />
                    KDS - Cozinha
                </h2>
                <div className="text-sm font-mono bg-secondary px-3 py-1 rounded">
                    {new Date(currentTime).toLocaleTimeString()}
                </div>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-6 lg:w-[900px] mb-4">
                    <TabsTrigger value="all">Visão Geral</TabsTrigger>
                    <TabsTrigger value="sushi" className="gap-2"><Fish className="w-4 h-4" /> Sushi</TabsTrigger>
                    <TabsTrigger value="kitchen" className="gap-2"><UtensilsCrossed className="w-4 h-4" /> Cozinha</TabsTrigger>
                    <TabsTrigger value="bar" className="gap-2"><Wine className="w-4 h-4" /> Bar</TabsTrigger>
                    <TabsTrigger value="service" className="gap-2"><Bell className="w-4 h-4" /> Serviço</TabsTrigger>
                    <TabsTrigger value="completed" className="gap-2"><CheckCircle2 className="w-4 h-4" /> Concluídos</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="flex-1 mt-0">
                    <RenderOrders tab="all" />
                </TabsContent>
                <TabsContent value="sushi" className="flex-1 mt-0">
                    <RenderOrders tab="sushi" />
                </TabsContent>
                <TabsContent value="kitchen" className="flex-1 mt-0">
                    <RenderOrders tab="kitchen" />
                </TabsContent>
                <TabsContent value="bar" className="flex-1 mt-0">
                    <RenderOrders tab="bar" />
                </TabsContent>

                <TabsContent value="service" className="flex-1 mt-0">
                    {serviceRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                            <Bell className="w-16 h-16 mb-4" />
                            <p>Nenhuma solicitação de serviço no momento.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {serviceRequests.map((req) => (
                                <div key={req.id} className="group relative overflow-hidden bg-card/50 backdrop-blur-xl rounded-[24px] border border-red-500/20 shadow-lg hover:shadow-red-500/10 transition-all duration-500 hover:-translate-y-1">
                                    {/* Abstract Background Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-50" />

                                    {/* Pashing Light Effect */}
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-red-600/50" />

                                    <div className="p-6 relative z-10 flex flex-col h-full gap-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                    <span className="text-xl font-black uppercase tracking-tight">Mesa {req.tableId}</span>
                                                </div>
                                                {req.userName && (
                                                    <div className="text-sm font-bold text-muted-foreground/80 flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {req.userName}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50 text-xs font-mono font-medium text-muted-foreground flex items-center gap-2 shadow-sm">
                                                <Clock className="w-3 h-3 text-red-500" />
                                                <Timer startTime={req.timestamp} />
                                            </div>
                                        </div>

                                        {/* Center Icon & Label */}
                                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-2">
                                            <div className="relative">
                                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-all duration-500 ${req.type === 'machine' ? 'bg-gradient-to-tr from-orange-500 to-orange-400' : 'bg-gradient-to-tr from-red-600 to-red-500'}`}>
                                                    {req.type === 'machine' ? (
                                                        <CreditCard className="w-10 h-10 text-white" />
                                                    ) : (
                                                        <BellRing className="w-10 h-10 text-white animate-wiggle" />
                                                    )}
                                                </div>
                                                {/* Glow */}
                                                <div className={`absolute inset-0 blur-2xl opacity-40 ${req.type === 'machine' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                            </div>

                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black uppercase tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                                                    {req.type === 'machine' ? 'Maquininha' : 'Chamar Garçom'}
                                                </h3>
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    {req.type === 'machine' ? 'Levar terminal de pagamento' : 'Solicitação de ajuda na mesa'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => completeRequest(req.id)}
                                            className="w-full group/btn relative overflow-hidden bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-500/25 transition-all active:scale-95"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                            <div className="relative flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-5 h-5" />
                                                <span>Atender Solicitação</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="completed" className="flex-1 mt-0">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={clearHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors font-semibold"
                        >
                            <Trash2 className="w-4 h-4" />
                            Limpar Histórico
                        </button>
                    </div>
                    <RenderOrders tab="completed" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
