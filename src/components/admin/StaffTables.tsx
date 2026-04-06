
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
    Users, Clock, Receipt, UtensilsCrossed, 
    ChevronRight, Armchair, AlertCircle, 
    Timer, LogOut, CheckCircle2, User, 
    Fish, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface TableData {
    id: string;
    seats: number;
    status: 'free' | 'occupied' | 'waiting_payment' | 'ordered' | 'eating' | 'cleaning';
    last_activity_at: string | null;
    occupants?: any[];
}

export function StaffTables() {
    const { slug } = useParams();
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [tables, setTables] = useState<TableData[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');

    // Sync current time for timers
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            let currentId = establishmentId;
            if (!currentId && slug) {
                const { data: est } = await supabase.from('establishments').select('id').eq('slug', slug).single();
                if (est) {
                    currentId = est.id;
                    setEstablishmentId(est.id);
                }
            }
            if (!currentId) return;

            // Fetch Tables
            const { data: tableData } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('establishment_id', currentId)
                .is('is_label', false); // Only real tables

            if (tableData) {
                setTables(tableData.map(t => ({
                    id: t.id,
                    seats: t.seats,
                    status: t.status || 'free',
                    last_activity_at: t.last_activity_at,
                    occupants: t.occupants || []
                })));
            }

            // Fetch Active Orders
            const { data: ordersData } = await supabase
                .from('orders')
                .select('*, order_items(*, menu_items(*))')
                .eq('establishment_id', currentId)
                .not('status', 'in', '(paid,archived,cancelled)');
            
            setOrders(ordersData || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchData();
        if (establishmentId) {
            const channel = supabase.channel(`staff_sync_${establishmentId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `establishment_id=eq.${establishmentId}` }, () => fetchData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` }, () => fetchData())
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [establishmentId, slug]);

    const getTableMetrics = (tableId: string) => {
        const table = tables.find(t => t.id === tableId);
        if (!table || table.status === 'free') return null;

        const tableOrders = orders.filter(o => o.table_id === tableId);
        const satDownAt = table.last_activity_at ? new Date(table.last_activity_at).getTime() : currentTime;
        
        const total = tableOrders.reduce((sum, o) => {
            const itemsTotal = (o.order_items || []).reduce((s: number, i: any) => s + (Number(i.price) * i.quantity), 0);
            return sum + (Number(o.total_amount) || itemsTotal);
        }, 0);

        return {
            satDownAt,
            durationMins: Math.floor((currentTime - satDownAt) / 60000),
            total,
            orderCount: tableOrders.length,
            occupants: table.occupants || []
        };
    };

    const releaseTable = async (tableId: string) => {
        if (!confirm(`Deseja realmente liberar a Mesa ${tableId}?`)) return;

        try {
            const tableOrders = orders.filter(o => o.table_id === tableId);
            if (tableOrders.length > 0) {
                const orderIds = tableOrders.map(o => o.id);
                await supabase.from('orders').update({ status: 'archived', completed_at: new Date().toISOString() }).in('id', orderIds);
                await supabase.from('order_items').update({ status: 'ready' }).in('order_id', orderIds).neq('status', 'ready');
            }

            await supabase.from('restaurant_tables').update({
                status: 'free',
                last_activity_at: null,
                occupants: []
            }).eq('id', tableId).eq('establishment_id', establishmentId);

            toast.success(`Mesa ${tableId} liberada!`);
            setSelectedTableId(null);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao liberar mesa");
        }
    };

    const getTableStatusLabel = (status: string) => {
        switch (status) {
            case 'occupied': return 'Ocupada';
            case 'ordered': return 'Pedido Feito';
            case 'eating': return 'Comendo';
            case 'waiting_payment': return 'Pagamento';
            case 'free': return 'Livre';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'occupied': return 'bg-red-500';
            case 'ordered': return 'bg-orange-500';
            case 'eating': return 'bg-blue-500';
            case 'waiting_payment': return 'bg-amber-500';
            case 'free': return 'bg-emerald-500';
            default: return 'bg-zinc-400';
        }
    };

    const formatTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    };

    const selectedMetrics = selectedTableId ? getTableMetrics(selectedTableId) : null;
    const selectedTable = tables.find(t => t.id === selectedTableId);

    const getLastOrders = (tableId: string) => {
        const tableOrders = orders.filter(o => o.table_id === tableId);
        const allItems: any[] = [];
        tableOrders.forEach(o => {
            if (o.order_items) {
                allItems.push(...o.order_items.map((oi: any) => ({
                    ...oi,
                    _author: o.customer_name || 'Cliente',
                    _time: o.created_at
                })));
            }
        });
        return allItems.reverse();
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(table => {
                    const metrics = getTableMetrics(table.id);
                    const isOccupied = table.status !== 'free';

                    return (
                        <div 
                            key={table.id}
                            onClick={() => {
                                setSelectedTableId(table.id);
                                setActiveTab('info');
                            }}
                            className={`group relative bg-white rounded-3xl border border-border/40 p-5 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer overflow-hidden
                                ${isOccupied ? 'ring-1 ring-black/[0.02]' : 'opacity-80 hover:opacity-100'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase leading-none mb-1">Mesa {table.id}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(table.status)}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                                            {getTableStatusLabel(table.status)}
                                        </span>
                                    </div>
                                </div>
                                <div className={`p-2.5 rounded-2xl ${isOccupied ? 'bg-primary/5 text-primary' : 'bg-secondary/40 text-muted-foreground'}`}>
                                    <Armchair className="w-5 h-5" />
                                </div>
                            </div>

                            {isOccupied && metrics ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Timer className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold font-mono">{formatTime(currentTime - metrics.satDownAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Users className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold">{metrics.occupants.length} pessoas</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 leading-none mb-1">Subtotal</p>
                                            <p className="text-xl font-black text-foreground tracking-tighter">
                                                R$ {metrics.total.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <div className="flex-1 px-3 py-2 rounded-xl bg-secondary/30 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{metrics.orderCount} pedidos</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-primary" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-border/20 rounded-2xl opacity-40">
                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mb-2">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Abrir Mesa</span>
                                </div>
                            )}

                            <div className={`absolute top-0 right-0 w-1.5 h-full ${getStatusColor(table.status)} opacity-80`} />
                        </div>
                    );
                })}
            </div>

            {/* Details Modal */}
            <Dialog open={!!selectedTableId} onOpenChange={() => setSelectedTableId(null)}>
                <DialogContent className="max-w-2xl w-[95vw] rounded-[2.5rem] p-0 overflow-hidden bg-white/80 backdrop-blur-2xl border-white/40 shadow-2xl">
                    <DialogHeader className="p-8 pb-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${getStatusColor(selectedTable?.status || 'free')}`}>
                                    <Armchair className="w-6 h-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-3xl font-black tracking-tighter uppercase leading-none mb-1">Mesa {selectedTableId}</DialogTitle>
                                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                        {getTableStatusLabel(selectedTable?.status || 'free')}
                                    </DialogDescription>
                                </div>
                            </div>
                            {selectedTable?.status !== 'free' && (
                                <Button 
                                    variant="outline" 
                                    className="rounded-xl border-red-100 text-red-500 hover:bg-red-50 gap-2 h-12 px-4 font-bold"
                                    onClick={() => releaseTable(selectedTableId!)}
                                >
                                    <LogOut className="w-4 h-4" /> Liberar
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    {selectedTable?.status !== 'free' ? (
                        <div className="flex flex-col h-[500px]">
                            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col pt-6">
                                <TabsList className="mx-8 bg-secondary/40 p-1.5 rounded-2xl h-14">
                                    <TabsTrigger value="info" className="flex-1 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary">
                                        <Users className="w-4 h-4" /> Integrantes
                                    </TabsTrigger>
                                    <TabsTrigger value="orders" className="flex-1 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary">
                                        <Receipt className="w-4 h-4" /> Pedidos
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex-1 overflow-y-auto px-8 py-6">
                                    <TabsContent value="info" className="m-0 space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {selectedMetrics?.occupants.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-border/40 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {p.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm leading-none">{p.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{p.type === 'rodizio' ? 'Rodízio' : 'À La Carte'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subtotal Acumulado</span>
                                                <Timer className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="text-4xl font-black tracking-tighter">R$ {selectedMetrics?.total.toFixed(2)}</p>
                                                <p className="text-xs font-bold text-primary font-mono bg-white px-3 py-1 rounded-full shadow-sm mb-1">
                                                    {selectedMetrics ? formatTime(currentTime - selectedMetrics.satDownAt) : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="orders" className="m-0 space-y-3">
                                        {getLastOrders(selectedTableId!).map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-border/40 shadow-sm relative overflow-hidden group">
                                                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center font-bold text-foreground">
                                                    {item.quantity}x
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h5 className="font-bold text-sm">{item.menu_items?.name}</h5>
                                                        <span className="font-mono text-xs font-bold text-primary">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                                            Pôr {item._author}
                                                        </span>
                                                        <div className="w-1 h-1 rounded-full bg-zinc-300" />
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                                            {new Date(item._time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="p-12 text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                                <Armchair className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black tracking-tight">Mesa Disponível</h3>
                                <p className="text-sm text-muted-foreground px-8">Esta mesa está livre no momento. Peça aos clientes para escanearem o código QR para iniciar o atendimento.</p>
                            </div>
                            <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest gap-3" onClick={() => setSelectedTableId(null)}>
                                Voltar ao Mapa
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
