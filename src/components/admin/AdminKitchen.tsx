import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    Clock, CheckCircle2, ChefHat, Bell, UtensilsCrossed,
    Wine, Fish, Layers, CreditCard, BellRing, AlertTriangle,
    Flame, Trash2, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useInventory } from '@/contexts/InventoryContext';
import { OrderItem } from '@/contexts/OrderContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Order {
    id: string;
    timestamp: number;
    items: OrderItem[];
    status: string;
    tableId?: string;
    completedAt?: number;
}

// ── Stations Config ────────────────────────────────────────────────────────────

const STATIONS = [
    { id: 'all',       label: 'Todas',      icon: Layers },
    { id: 'sushi',     label: 'Sushi',      icon: Fish },
    { id: 'kitchen',   label: 'Cozinha',    icon: UtensilsCrossed },
    { id: 'bar',       label: 'Bar',        icon: Wine },
    { id: 'service',   label: 'Serviço',    icon: Bell },
    { id: 'completed', label: 'Concluídos', icon: CheckCircle2 },
];

// ── Timer Hook ─────────────────────────────────────────────────────────────────

function useElapsed(startTime: number, completedAt?: number) {
    const [elapsed, setElapsed] = useState(completedAt ? completedAt - startTime : Date.now() - startTime);
    useEffect(() => {
        if (completedAt) { setElapsed(completedAt - startTime); return; }
        const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
        return () => clearInterval(id);
    }, [startTime, completedAt]);
    return elapsed;
}

// ── Timer Display ──────────────────────────────────────────────────────────────

const TimerBadge = ({ startTime, completedAt }: { startTime: number; completedAt?: number }) => {
    const elapsed = useElapsed(startTime, completedAt);
    const min = Math.floor(elapsed / 60000);
    const sec = Math.floor((elapsed % 60000) / 1000);

    const isLate = !completedAt && min >= 20;
    const isWarn = !completedAt && min >= 10;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tabular-nums border ${completedAt
            ? 'bg-zinc-50 text-zinc-400 border-zinc-200'
            : isLate ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                : isWarn ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
            <Clock className="w-3 h-3 shrink-0" />
            {min.toString().padStart(2, '0')}:{sec.toString().padStart(2, '0')}
            {isLate && <Flame className="w-3 h-3" />}
        </div>
    );
};

// ── Urgency border helper ──────────────────────────────────────────────────────

const getUrgencyStyle = (startTime: number, completedAt?: number) => {
    const elapsed = (completedAt || Date.now()) - startTime;
    const min = Math.floor(elapsed / 60000);
    if (min >= 20) return 'border-l-red-400';
    if (min >= 10) return 'border-l-amber-400';
    return 'border-l-emerald-400';
};

// ── Main Component ─────────────────────────────────────────────────────────────

export function AdminKitchen() {
    const { deductStockForOrder } = useInventory();
    const { slug } = useParams();
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [serviceRequests, setServiceRequests] = useState<any[]>([]);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const fetchOrders = useCallback(async () => {
        if (!slug) return;
        try {
            const { data: est } = await supabase.from('establishments').select('id').eq('slug', slug).single();
            if (!est) return;

            const { data: ordersData } = await supabase
                .from('orders')
                .select('*, order_items(*, menu_items(id, code, name, station, is_rodizio))')
                .eq('establishment_id', est.id)
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false });

            const processed: Order[] = (ordersData || []).map(o => ({
                id: o.id,
                timestamp: new Date(o.created_at).getTime(),
                status: o.status,
                tableId: o.table_id,
                completedAt: o.completed_at ? new Date(o.completed_at).getTime() : undefined,
                items: (o.order_items || [])
                    .filter((oi: any) => oi.menu_items?.station !== 'none')
                    .map((oi: any) => ({
                        id: oi.id,
                        dbMenuItemId: oi.item_id,
                        code: oi.menu_items?.code || '',
                        name: oi.menu_items?.name || '',
                        quantity: oi.quantity,
                        status: oi.status,
                        observation: oi.observation,
                        station: oi.menu_items?.station,
                        price: Number(oi.price),
                        isRodizio: oi.menu_items?.is_rodizio
                    }))
            }));
            setOrders(processed);
        } catch (e) { console.error('KDS fetch error:', e); }
    }, [slug]);

    const fetchRequests = useCallback(async (id: string) => {
        const { data } = await supabase.from('service_requests').select('*').eq('establishment_id', id).eq('status', 'pending');
        setServiceRequests((data || []).map(r => ({
            id: r.id, type: r.type, tableId: r.table_id,
            timestamp: new Date(r.created_at).getTime(),
        })));
    }, []);

    useEffect(() => {
        fetchOrders();
        const ch = supabase.channel('kds_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchOrders)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [fetchOrders]);

    useEffect(() => {
        if (!slug) return;
        supabase.from('establishments').select('id').eq('slug', slug).single().then(({ data }) => {
            if (data) { setEstablishmentId(data.id); fetchRequests(data.id); }
        });
    }, [slug, fetchRequests]);

    useEffect(() => {
        if (!establishmentId) return;
        const ch = supabase.channel(`kds_svc_${establishmentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `establishment_id=eq.${establishmentId}` },
                (p) => { if (p.eventType === 'INSERT') toast.info('Nova solicitação!'); fetchRequests(establishmentId); })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [establishmentId, fetchRequests]);

    const markReady = async (orderId: string, itemIds: string[]) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;
            await supabase.from('order_items').update({ status: 'ready' }).in('id', itemIds);
            const updatedItems = order.items.map(i => itemIds.includes(i.id) ? { ...i, status: 'ready' as any } : i);
            const allReady = updatedItems.every(i => i.status === 'ready');
            await supabase.from('orders').update({ status: allReady ? 'completed' : 'preparing', ...(allReady ? { completed_at: new Date().toISOString() } : {}) }).eq('id', orderId);
            if (allReady) {
                const toDeduct = itemIds.map(id => order.items.find(i => i.id === id)).filter(Boolean).map(i => ({ idOrCode: i!.code, quantity: i!.quantity }));
                if (toDeduct.length) deductStockForOrder(toDeduct);
            }
            toast.success('Pedido atualizado');
        } catch { toast.error('Erro ao atualizar'); }
    };

    const completeRequest = async (id: string) => {
        await supabase.from('service_requests').update({ status: 'completed' }).eq('id', id);
        if (establishmentId) fetchRequests(establishmentId);
    };

    const clearHistory = async () => {
        if (!confirm('Arquivar pedidos concluídos?')) return;
        await supabase.from('orders').update({ status: 'archived' }).eq('status', 'completed');
        toast.success('Histórico arquivado');
    };

    const filterItems = (items: OrderItem[], tab: string) => {
        const prepared = items.filter(i => i.station !== 'none');
        return tab === 'all' || tab === 'completed' ? prepared : prepared.filter(i => i.station === tab);
    };

    const getTabOrders = (tab: string) => orders.filter(order => {
        if (tab === 'completed') return order.status === 'completed';
        if (['completed', 'archived'].includes(order.status)) return false;
        if (tab === 'service') return false;
        return filterItems(order.items, tab).length > 0;
    }).sort((a, b) => a.timestamp - b.timestamp);

    const activeCount = orders.filter(o => !['completed', 'archived'].includes(o.status)).length;

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 animate-in fade-in duration-500">

            {/* ─── Header ──────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">KDS — Kitchen Display</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">
                        {activeCount} pedido{activeCount !== 1 ? 's' : ''} ativo{activeCount !== 1 ? 's' : ''} ·{' '}
                        {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                </div>
                {serviceRequests.length > 0 && (
                    <div
                        className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => setActiveTab('service')}
                    >
                        <Bell className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-bold text-red-600">{serviceRequests.length} solicitação{serviceRequests.length > 1 ? 'ões' : ''}</span>
                    </div>
                )}
            </div>

            {/* ─── Station Tabs ─────────────────────────────────────────────────── */}
            <div className="flex gap-2 flex-wrap">
                {STATIONS.map(station => {
                    const count = station.id === 'service'
                        ? serviceRequests.length
                        : station.id === 'completed'
                            ? orders.filter(o => o.status === 'completed').length
                            : getTabOrders(station.id).length;
                    const active = activeTab === station.id;

                    return (
                        <button
                            key={station.id}
                            onClick={() => setActiveTab(station.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${active
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700'
                            }`}
                        >
                            <station.icon className="w-3.5 h-3.5" />
                            {station.label}
                            {count > 0 && (
                                <span className={`text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none ${active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ─── Service Alerts Tab ───────────────────────────────────────────── */}
            {activeTab === 'service' && (
                <div>
                    {serviceRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                            <Bell className="w-10 h-10 mb-3 opacity-30" />
                            <p className="font-semibold text-sm">Nenhuma solicitação pendente</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {serviceRequests.map(req => (
                                <div key={req.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-black text-zinc-900">Mesa {req.tableId}</span>
                                        <TimerBadge startTime={req.timestamp} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${req.type === 'machine' ? 'bg-amber-50' : 'bg-red-50'}`}>
                                            {req.type === 'machine'
                                                ? <CreditCard className="w-6 h-6 text-amber-500" />
                                                : <BellRing className="w-6 h-6 text-red-500" />}
                                        </div>
                                        <p className="text-sm font-bold text-zinc-700">
                                            {req.type === 'machine' ? 'Levar maquininha' : 'Chamar garçom'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => completeRequest(req.id)}
                                        className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Atendido
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Completed Tab ────────────────────────────────────────────────── */}
            {activeTab === 'completed' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={clearHistory} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-red-500 border border-zinc-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Arquivar todos
                        </button>
                    </div>
                    <OrderGrid tab="completed" orders={orders} filterItems={filterItems} markReady={markReady} />
                </div>
            )}

            {/* ─── Station Order Grids ──────────────────────────────────────────── */}
            {!['service', 'completed'].includes(activeTab) && (
                <OrderGrid tab={activeTab} orders={orders} filterItems={filterItems} markReady={markReady} />
            )}
        </div>
    );
}

// ── Order Grid Sub-component ───────────────────────────────────────────────────

function OrderGrid({ tab, orders, filterItems, markReady }: {
    tab: string;
    orders: Order[];
    filterItems: (items: OrderItem[], tab: string) => OrderItem[];
    markReady: (orderId: string, itemIds: string[]) => void;
}) {
    const relevant = orders.filter(order => {
        if (tab === 'completed') return order.status === 'completed';
        if (['completed', 'archived'].includes(order.status)) return false;
        return filterItems(order.items, tab).length > 0;
    }).sort((a, b) => a.timestamp - b.timestamp);

    if (relevant.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                <ChefHat className="w-10 h-10 mb-3 opacity-30" />
                <p className="font-semibold text-sm">Nenhum pedido nesta estação</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {relevant.map(order => {
                const stationItems = filterItems(order.items, tab);
                const allDone = stationItems.every(i => i.status === 'ready');
                const elapsed = (order.completedAt || Date.now()) - order.timestamp;
                const isLate = !order.completedAt && Math.floor(elapsed / 60000) >= 20;

                return (
                    <div key={order.id} className={`bg-white rounded-2xl border-l-4 border border-zinc-100 ${getUrgencyStyle(order.timestamp, order.completedAt)} shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow ${allDone ? 'opacity-60' : ''}`}>

                        {/* Card Header */}
                        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                {isLate && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                <span className="font-black text-zinc-900 text-base truncate">Mesa {order.tableId}</span>
                                <span className="text-[10px] text-zinc-400 font-mono shrink-0">#{order.id.slice(0, 5).toUpperCase()}</span>
                            </div>
                            <TimerBadge startTime={order.timestamp} completedAt={order.completedAt} />
                        </div>

                        {/* Items List */}
                        <div className="flex-1 p-4 space-y-2.5">
                            {stationItems.map((item, idx) => (
                                <div key={idx} className={`flex items-start gap-2.5 ${item.status === 'ready' ? 'opacity-40' : ''}`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${item.status === 'ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-700'}`}>
                                        {item.quantity}×
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold leading-tight ${item.status === 'ready' ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                                            {item.name}
                                        </p>
                                        {item.observation && (
                                            <div className={`text-[10px] mt-1 px-2 py-0.5 rounded font-semibold inline-block ${item.observation.toLowerCase().includes('alergi')
                                                ? 'bg-red-50 text-red-600 border border-red-100'
                                                : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                {item.observation.toLowerCase().includes('alergi') ? '⚠️ ' : '📝 '}{item.observation}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Button */}
                        <div className="px-4 pb-4">
                            {!allDone ? (
                                <button
                                    onClick={() => markReady(order.id, stationItems.map(i => i.id))}
                                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {tab === 'all' ? 'Concluir Pedido' : 'Pronto'}
                                </button>
                            ) : (
                                <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Concluído
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
