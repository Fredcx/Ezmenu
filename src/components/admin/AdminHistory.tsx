import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    ShoppingBag, Search, Calendar, ChevronRight, 
    ArrowLeft, User, MapPin, Receipt, Clock, 
    Filter, Download, ChevronDown, Table as TableIcon,
    Trash2, AlertTriangle as AlertTriangleIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Dialog, DialogContent, DialogHeader, 
    DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
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
        try {
            setLoading(true);
            const { data: est } = await supabase
                .from('establishments')
                .select('id')
                .eq('slug', slug)
                .single();
            
            if (!est) return;
            setEstablishmentId(est.id);

            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*, menu_items(*))')
                .eq('establishment_id', est.id)
                .in('status', ['completed', 'archived'])
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error("Error fetching history:", err);
            toast.error("Erro ao carregar histórico.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [slug]);

    const handleCleanup = async () => {
        if (!establishmentId) return;
        
        try {
            setLoading(true);
            // 1. Fetch IDs of orders to be deleted
            let selectQuery = supabase
                .from('orders')
                .select('id')
                .eq('establishment_id', establishmentId)
                .in('status', ['completed', 'archived']);

            if (cleanupDays !== 'all') {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - (cleanupDays as number));
                selectQuery = selectQuery.lt('created_at', cutoffDate.toISOString());
            }

            const { data: ordersToClean, error: selectError } = await selectQuery;
            if (selectError) throw selectError;

            if (ordersToClean && ordersToClean.length > 0) {
                const orderIds = ordersToClean.map(o => o.id);

                // 2. Manual delete associated items (failsafe if cascade is missing)
                const { error: itemsError } = await supabase
                    .from('order_items')
                    .delete()
                    .in('order_id', orderIds);
                
                if (itemsError) throw itemsError;

                // 3. Delete the orders
                const { error: ordersError } = await supabase
                    .from('orders')
                    .delete()
                    .in('id', orderIds);

                if (ordersError) throw ordersError;
            }

            toast.success("Histórico limpo com sucesso!");
            setIsCleanupOpen(false);
            fetchHistory();
        } catch (err: any) {
            console.error("Error cleaning up:", err);
            toast.error(`Erro ao limpar: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const calculateOrderTotal = (order: HistoricalOrder) => {
        if (order.total_amount !== null && order.total_amount !== undefined) return order.total_amount;
        return order.order_items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    };

    const filteredOrders = orders.filter(o => 
        o.table_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Histórico de Comandas
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg font-medium opacity-70">
                        Consulte registros de mesas e atendimentos finalizados.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        className="rounded-2xl gap-2 font-bold bg-white shadow-sm text-red-500 hover:bg-red-50 hover:text-red-600 border-red-100"
                        onClick={() => setIsCleanupOpen(true)}
                    >
                        <Trash2 className="w-5 h-5" /> Limpar Histórico
                    </Button>
                    <Button variant="outline" className="rounded-2xl gap-2 font-bold bg-white shadow-sm">
                        <Download className="w-5 h-5" /> Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/50 backdrop-blur-xl p-4 rounded-[2.5rem] border border-border/40 shadow-premium flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                    <Input 
                        placeholder="Buscar por mesa ou cliente..." 
                        className="pl-14 h-14 rounded-full border-none bg-secondary/30 focus-visible:ring-primary/20 font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="secondary" className="h-14 rounded-full px-8 font-black uppercase tracking-widest gap-2 bg-secondary/50">
                    <Calendar className="w-5 h-5" /> Hoje
                    <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
                <Button variant="secondary" className="h-14 rounded-full px-8 font-black uppercase tracking-widest gap-2 bg-secondary/50">
                    <Filter className="w-5 h-5" /> Filtros
                </Button>
            </div>

            {/* Orders List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 rounded-[2.5rem] bg-secondary/20 animate-pulse border border-border/20" />
                    ))
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                        <div 
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="group bg-white p-6 rounded-[2.5rem] shadow-premium border border-border/40 hover:shadow-premium-hover hover:-translate-y-1 transition-premium cursor-pointer relative overflow-hidden active:scale-95"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
                            
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <TableIcon className="w-4 h-4" />
                                        </div>
                                        <span className="text-2xl font-black tracking-tighter">Mesa {order.table_id}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                    Finalizada
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                                    <User className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Cliente</span>
                                    <span className="font-bold text-sm tracking-tight">{order.customer_name || 'Consumidor'}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/40 flex justify-between items-end relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-50">Total Fechado</span>
                                    <span className="text-2xl font-black text-primary tracking-tighter">
                                        R$ {calculateOrderTotal(order).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground space-y-4 bg-secondary/10 rounded-[3rem] border-2 border-dashed border-border/40">
                        <ShoppingBag className="w-16 h-16 opacity-10" />
                        <p className="text-lg font-bold opacity-40 italic">Nenhum registro encontrado.</p>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-xl w-[95%] rounded-[3rem] p-0 border-none shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar z-50 bg-white">
                    {selectedOrder && (
                        <div className="flex flex-col h-full bg-white">
                            <div className="p-8 bg-gradient-to-br from-zinc-900 to-black text-white relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                                
                                <DialogHeader className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-primary ring-1 ring-white/20">
                                            <TableIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-3xl font-black tracking-tighter">Mesa {selectedOrder.table_id}</DialogTitle>
                                            <DialogDescription className="text-white/60 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(selectedOrder.created_at).toLocaleString('pt-BR')} 
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-[1.8rem] bg-secondary/30 border border-border/40">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2 opacity-60">Cliente</span>
                                        <span className="font-black text-foreground uppercase italic">{selectedOrder.customer_name || 'N/A'}</span>
                                    </div>
                                    <div className="p-5 rounded-[1.8rem] bg-secondary/30 border border-border/40">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2 opacity-60">Status PGTO</span>
                                        <span className="font-black text-emerald-600 uppercase italic">Confirmado</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                        <Receipt className="w-4 h-4 text-primary" /> 
                                        Itens Consumidos
                                        <div className="h-px bg-border/40 flex-1"></div>
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        {selectedOrder.order_items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/20 group hover:bg-secondary/20 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-border flex items-center justify-center font-black text-sm text-foreground">
                                                        {item.quantity}x
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm tracking-tight text-foreground">{item.menu_items?.name}</span>
                                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                                                            {item.menu_items?.is_rodizio ? 'Rodízio' : 'À La Carte'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-mono font-bold text-sm text-muted-foreground">
                                                    R$ {(Number(item.price) * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-border/40 bg-zinc-50">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">Valor Final da Comanda</span>
                                        <span className="text-4xl font-black text-primary tracking-tighter leading-none">
                                            R$ {calculateOrderTotal(selectedOrder).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <Button 
                                        className="h-14 px-8 rounded-full font-black uppercase tracking-widest scale-105 shadow-xl shadow-primary/20"
                                        onClick={() => setSelectedOrder(null)}
                                    >
                                        Fechar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Cleanup Dialog */}
            <Dialog open={isCleanupOpen} onOpenChange={setIsCleanupOpen}>
                <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-[95%] rounded-[2.5rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar z-50 bg-white">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    
                    <DialogHeader className="mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tighter">Limpar Histórico</DialogTitle>
                        <DialogDescription className="text-sm font-medium">
                            Selecione o período de pedidos finalizados que deseja remover permanentemente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 mb-8">
                        {[
                            { label: 'Há mais de 24 horas', value: 1 },
                            { label: 'Há mais de 7 dias', value: 7 },
                            { label: 'Há mais de 30 dias', value: 30 },
                            { label: 'Todo o histórico', value: 'all' }
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setCleanupDays(opt.value as any)}
                                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-300 ${
                                    cleanupDays === opt.value
                                        ? 'bg-red-50 border-red-200 ring-2 ring-red-500/10'
                                        : 'bg-secondary/20 border-border/40 hover:bg-secondary/40'
                                }`}
                            >
                                <span className={`font-bold ${cleanupDays === opt.value ? 'text-red-700' : 'text-foreground'}`}>
                                    {opt.label}
                                </span>
                                {cleanupDays === opt.value && (
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex bg-amber-50 rounded-2xl p-4 border border-amber-100 gap-3 mb-8">
                        <AlertTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-[11px] font-bold text-amber-700 leading-tight italic uppercase tracking-wider">
                            Essa ação não pode ser desfeita. Certifique-se de que não precisará mais destes registros.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Button 
                            variant="outline" 
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px]"
                            onClick={() => setIsCleanupOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-red-500/20"
                            onClick={handleCleanup}
                        >
                            Limpar Agora
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
