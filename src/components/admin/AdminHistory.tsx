import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    ShoppingBag, Search, Calendar, ChevronRight, User,
    Receipt, Clock, Download, Trash2, AlertTriangle, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface HistoricalOrder {
    id: string;
    table_id: string;
    customer_name: string;
    created_at: string;
    completed_at: string | null;
    status: string;
    total_amount: number | null;
    order_items: any[];
}

const calcTotal = (order: HistoricalOrder) =>
    order.total_amount ?? order.order_items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

const formatDuration = (start: string, end: string | null) => {
    if (!end) return '—';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const m = Math.floor(ms / 60000);
    return `${m}min`;
};

export function AdminHistory() {
    const { slug } = useParams();
    const [orders, setOrders] = useState<HistoricalOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<HistoricalOrder | null>(null);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [isCleanupOpen, setIsCleanupOpen] = useState(false);
    const [cleanupDays, setCleanupDays] = useState<number | 'all'>(30);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data: est } = await supabase.from('establishments').select('id').eq('slug', slug).single();
            if (!est) return;
            setEstablishmentId(est.id);
            const { data, error } = await supabase
                .from('orders').select('*, order_items(*, menu_items(*))')
                .eq('establishment_id', est.id)
                .in('status', ['completed', 'archived'])
                .order('created_at', { ascending: false }).limit(100);
            if (error) throw error;
            setOrders(data || []);
        } catch { toast.error('Erro ao carregar histórico.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchHistory(); }, [slug]);

    const handleCleanup = async () => {
        if (!establishmentId) return;
        setLoading(true);
        try {
            let q = supabase.from('orders').select('id').eq('establishment_id', establishmentId).in('status', ['completed', 'archived']);
            if (cleanupDays !== 'all') {
                const cut = new Date(); cut.setDate(cut.getDate() - (cleanupDays as number));
                q = q.lt('created_at', cut.toISOString());
            }
            const { data: toClean } = await q;
            if (toClean?.length) {
                const ids = toClean.map(o => o.id);
                await supabase.from('order_items').delete().in('order_id', ids);
                await supabase.from('orders').delete().in('id', ids);
            }
            toast.success('Histórico limpo!');
            setIsCleanupOpen(false);
            fetchHistory();
        } catch (e: any) { toast.error(e.message); }
        finally { setLoading(false); }
    };

    // Group by date
    const filtered = orders.filter(o =>
        o.table_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = filtered.reduce((acc, order) => {
        const date = new Date(order.created_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(order);
        return acc;
    }, {} as Record<string, HistoricalOrder[]>);

    const dayTotal = (orders: HistoricalOrder[]) => orders.reduce((s, o) => s + calcTotal(o), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Histórico</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Comandas e atendimentos finalizados.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsCleanupOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-100 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" /> Limpar
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-500 text-sm font-semibold hover:bg-zinc-50 transition-colors">
                        <Download className="w-4 h-4" /> Exportar
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por mesa ou cliente…"
                    className="pl-9 h-10 rounded-xl border-zinc-200 text-sm" />
            </div>

            {/* Orders grouped by day */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-zinc-100 animate-pulse" />)}
                </div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                    <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
                    <p className="font-semibold text-sm">Nenhum registro encontrado</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([date, dayOrders]) => (
                        <div key={date}>
                            {/* Day Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-zinc-400" />
                                    <h3 className="text-sm font-bold text-zinc-900 capitalize">{date}</h3>
                                    <span className="text-xs text-zinc-400 font-medium">({dayOrders.length} comanda{dayOrders.length > 1 ? 's' : ''})</span>
                                </div>
                                <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                                    R$ {dayTotal(dayOrders).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            {/* Orders list */}
                            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm divide-y divide-zinc-50 overflow-hidden">
                                {dayOrders.map(order => (
                                    <button
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors text-left group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-zinc-900 transition-colors">
                                            <Receipt className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-zinc-900 text-sm">Mesa {order.table_id}</span>
                                                <span className="hidden sm:inline text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                                                    {formatDuration(order.created_at, order.completed_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {order.customer_name && (
                                                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                                                        <User className="w-3 h-3" /> {order.customer_name}
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                                                    {order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-zinc-900 text-sm">R$ {calcTotal(order).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Order Detail Modal */}
            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    {selectedOrder && (
                        <>
                            {/* Modal Header */}
                            <div className="bg-zinc-900 text-white px-8 py-6 relative">
                                <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                                <DialogTitle className="text-2xl font-black tracking-tight">Mesa {selectedOrder.table_id}</DialogTitle>
                                <DialogDescription className="text-zinc-400 text-sm mt-1 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}
                                </DialogDescription>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="bg-zinc-800 rounded-xl px-3 py-2.5">
                                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Cliente</p>
                                        <p className="text-sm font-bold text-zinc-100">{selectedOrder.customer_name || '—'}</p>
                                    </div>
                                    <div className="bg-zinc-800 rounded-xl px-3 py-2.5">
                                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Duração</p>
                                        <p className="text-sm font-bold text-zinc-100">{formatDuration(selectedOrder.created_at, selectedOrder.completed_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="p-6 max-h-80 overflow-y-auto space-y-2">
                                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5" /> Itens Consumidos
                                </h4>
                                {selectedOrder.order_items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center text-xs font-black text-zinc-700 shrink-0">
                                            {item.quantity}×
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-zinc-800 truncate">{item.menu_items?.name}</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">{item.menu_items?.is_rodizio ? 'Rodízio' : 'À La Carte'}</p>
                                        </div>
                                        <span className="font-bold text-sm text-zinc-700 shrink-0">
                                            R$ {(Number(item.price) * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total da Comanda</p>
                                    <p className="text-2xl font-black text-zinc-900">R$ {calcTotal(selectedOrder).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-black rounded-lg border border-emerald-100 uppercase tracking-wider">Finalizada</span>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Cleanup Dialog */}
            <Dialog open={isCleanupOpen} onOpenChange={setIsCleanupOpen}>
                <DialogContent className="max-w-sm rounded-2xl p-6">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-zinc-900 mb-1">Limpar Histórico</DialogTitle>
                    <DialogDescription className="text-zinc-400 text-sm mb-5">Selecione o período a remover permanentemente.</DialogDescription>

                    <div className="space-y-2 mb-5">
                        {[{ label: 'Há mais de 24 horas', value: 1 }, { label: 'Há mais de 7 dias', value: 7 }, { label: 'Há mais de 30 dias', value: 30 }, { label: 'Todo o histórico', value: 'all' }].map(opt => (
                            <button key={opt.value} onClick={() => setCleanupDays(opt.value as any)}
                                className={`w-full p-3.5 rounded-xl border text-sm font-semibold text-left transition-all flex items-center justify-between ${cleanupDays === opt.value ? 'bg-red-50 border-red-200 text-red-700' : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'}`}>
                                {opt.label}
                                {cleanupDays === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                            </button>
                        ))}
                    </div>

                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-2.5 mb-5">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 font-semibold leading-relaxed">Esta ação é irreversível. Certifique-se de que não precisa mais destes registros.</p>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setIsCleanupOpen(false)} className="flex-1 h-11 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancelar</button>
                        <button onClick={handleCleanup} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors active:scale-95">Limpar Agora</button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
