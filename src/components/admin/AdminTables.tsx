import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    Download, Plus, Trash2, Edit2, Clock, UtensilsCrossed,
    Receipt, ChevronRight, QrCode, LogOut, Users, Armchair,
    CheckCircle2, AlertTriangle, Coffee, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

type TableStatus = 'free' | 'occupied' | 'ordered' | 'eating' | 'waiting_payment' | 'cleaning' | 'timeout';

interface RestaurantTable {
    id: string;
    seats: number;
    status: TableStatus;
    last_activity_at: string | null;
    occupants?: any[];
}

interface Order {
    id: string;
    table_id: string;
    status: string;
    customer_name: string;
    created_at: string;
    completed_at: string | null;
    total_amount: number | null;
    order_items: any[];
}

// ── Status Config ──────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; card: string; badge: string; dot: string }> = {
    free:            { label: 'Livre',      card: 'bg-white border-zinc-200 hover:border-zinc-300',              badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-400' },
    occupied:        { label: 'Ocupada',    card: 'bg-red-50/40 border-red-200 hover:border-red-300',             badge: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500' },
    ordered:         { label: 'Pedido',     card: 'bg-orange-50/40 border-orange-200 hover:border-orange-300',    badge: 'bg-orange-50 text-orange-700 border-orange-200',    dot: 'bg-orange-500' },
    eating:          { label: 'Comendo',    card: 'bg-blue-50/40 border-blue-200 hover:border-blue-300',          badge: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
    waiting_payment: { label: 'Pagamento',  card: 'bg-amber-50/40 border-amber-200 hover:border-amber-300',       badge: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
    cleaning:        { label: 'Limpeza',    card: 'bg-zinc-50 border-zinc-200',                                   badge: 'bg-zinc-100 text-zinc-600 border-zinc-200',         dot: 'bg-zinc-400' },
    timeout:         { label: 'Inativa',    card: 'bg-purple-50/40 border-purple-200',                            badge: 'bg-purple-50 text-purple-700 border-purple-200',    dot: 'bg-purple-500 animate-pulse' },
};

const getStatus = (table: RestaurantTable, orders: Order[], now: number): TableStatus => {
    if (table.status === 'free') return 'free';
    const tOrders = orders.filter(o => o.table_id === table.id && !['cancelled','archived'].includes(o.status));
    const satAt = table.last_activity_at ? new Date(table.last_activity_at).getTime() : now;
    const inactiveMins = Math.floor((now - (tOrders.length > 0
        ? Math.max(...tOrders.map(o => new Date(o.created_at).getTime()))
        : satAt)) / 60000);

    if (tOrders.length === 0 && inactiveMins >= 40) return 'timeout';
    if (table.status === 'waiting_payment') return 'waiting_payment';
    if (tOrders.length > 0) return inactiveMins > 20 ? 'eating' : 'ordered';
    return 'occupied';
};

const fmtDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return h > 0
        ? `${h}h${m.toString().padStart(2,'0')}m`
        : `${m.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
};

// ── Main Component ─────────────────────────────────────────────────────────────

export function AdminTables() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // UI State
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
    const [newTableName, setNewTableName] = useState('');
    const [newTableSeats, setNewTableSeats] = useState(4);
    const [showQr, setShowQr] = useState(false);
    const [filter, setFilter] = useState<'all' | 'free' | 'occupied'>('all');

    // Rodizio Management State
    const [rodizioAdults, setRodizioAdults] = useState(0);
    const [rodizioChildren, setRodizioChildren] = useState(0);
    const [isSavingRodizio, setIsSavingRodizio] = useState(false);

    useEffect(() => {
        const id = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const fetchData = useCallback(async () => {
        if (!slug) return;
        try {
            const { data: est } = await supabase.from('establishments').select('id').eq('slug', slug).single();
            if (!est) return;
            setEstablishmentId(est.id);

            const [tablesRes, ordersRes, sessRes] = await Promise.all([
                supabase.from('restaurant_tables').select('*').eq('establishment_id', est.id).order('id'),
                supabase.from('orders').select('*, order_items(*, menu_items(*))').eq('establishment_id', est.id).neq('status', 'cancelled').not('status', 'ilike', 'archived%'),
                supabase.auth.getSession()
            ]);

            if (tablesRes.data) {
                setTables(tablesRes.data.map((t: any) => ({
                    id: t.id, seats: t.seats, status: t.status || 'free',
                    last_activity_at: t.last_activity_at, occupants: t.occupants || []
                })));
            }
            if (ordersRes.data) setOrders(ordersRes.data);

            if (sessRes.data.session) {
                const { data: prof } = await supabase.from('profiles').select('role').eq('id', sessRes.data.session.user.id).single();
                setUserRole(prof?.role || null);
            }
        } catch (e) { console.error(e); }
    }, [slug]);

    useEffect(() => {
        fetchData();
        if (!establishmentId) return;
        const ch = supabase.channel(`tables_${establishmentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `establishment_id=eq.${establishmentId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [fetchData, establishmentId]);

    const addTable = async () => {
        if (!establishmentId || !newTableName.trim()) { toast.error('Nome da mesa é obrigatório'); return; }
        const id = newTableName.trim().toUpperCase();
        if (tables.some(t => t.id === id)) { toast.error(`Mesa "${id}" já existe`); return; }
        try {
            const { error } = await supabase.from('restaurant_tables').insert({
                id, establishment_id: establishmentId, seats: newTableSeats,
                status: 'free', shape: 'square', top_pos: '40%', left_pos: '40%',
                width: '60px', height: '60px', last_activity_at: null, occupants: []
            });
            if (error) throw error;
            toast.success(`Mesa ${id} criada!`);
            setIsAddOpen(false);
            setNewTableName('');
            setNewTableSeats(4);
            fetchData();
        } catch (e: any) { toast.error(e.message); }
    };

    const updateTable = async () => {
        if (!editingTable) return;
        try {
            const { error } = await supabase.from('restaurant_tables').update({ seats: editingTable.seats }).eq('id', editingTable.id);
            if (error) throw error;
            toast.success('Mesa atualizada!');
            setIsEditOpen(false);
            setEditingTable(null);
            fetchData();
        } catch (e: any) { toast.error(e.message); }
    };

    const deleteTable = async (id: string) => {
        if (!confirm(`Remover Mesa ${id}?`)) return;
        try {
            await supabase.from('restaurant_tables').delete().eq('id', id);
            toast.success(`Mesa ${id} removida`);
            fetchData();
        } catch (e: any) { toast.error(e.message); }
    };

    const releaseTable = async (tableId: string) => {
        if (!confirm(`Liberar Mesa ${tableId}?`)) return;
        try {
            const { data: tOrders } = await supabase.from('orders').select('id').eq('table_id', tableId).not('status', 'in', '("cancelled","archived")');
            if (tOrders?.length) {
                const ids = tOrders.map(o => o.id);
                await supabase.from('orders').update({ status: 'archived', completed_at: new Date().toISOString() }).in('id', ids);
                await supabase.from('order_items').update({ status: 'ready' }).in('order_id', ids).neq('status', 'ready');
            }
            if (establishmentId) {
                await supabase.from('service_requests').update({ status: 'archived' }).eq('table_id', tableId).eq('establishment_id', establishmentId);
            }
            await supabase.from('restaurant_tables').update({ status: 'free', last_activity_at: null, occupants: [] }).eq('id', tableId);
            toast.success(`Mesa ${tableId} liberada!`);
            setSelectedTable(null);
            fetchData();
        } catch (e) { toast.error('Erro ao liberar mesa'); }
    };

    const downloadQR = (tableId: string) => {
        const container = document.getElementById(`qr-${tableId}`);
        const svg = container?.querySelector('svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = 1024; canvas.height = 1024;
            if (ctx) {
                ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1024, 1024);
                ctx.drawImage(img, 64, 64, 896, 896);
                ctx.fillStyle = '#000'; ctx.font = 'bold 48px Inter,sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(`MESA ${tableId}`, 512, 990);
                const a = document.createElement('a'); a.download = `QR_Mesa_${tableId}.png`; a.href = canvas.toDataURL('image/png'); a.click();
                toast.success('QR Code baixado!');
            }
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const getOccupiedSince = (table: RestaurantTable) => table.last_activity_at ? new Date(table.last_activity_at).getTime() : currentTime;

    const handleAddRodizio = async (tableId: string) => {
        if (!establishmentId) return;
        if (rodizioAdults === 0 && rodizioChildren === 0) {
            toast.error('Informe a quantidade de pessoas.');
            return;
        }

        setIsSavingRodizio(true);
        try {
            // 1. Get or create a pending order
            let orderId = null;
            let currentStatus = 'free';
            const { data: estTable } = await supabase.from('restaurant_tables').select('status').eq('id', tableId).eq('establishment_id', establishmentId).single();
            if (estTable) currentStatus = estTable.status;

            if (currentStatus === 'free') {
                // Occupy the table
                await supabase.from('restaurant_tables').update({ 
                    status: 'occupied', 
                    last_activity_at: new Date().toISOString() 
                }).eq('id', tableId).eq('establishment_id', establishmentId);
            }

            const { data: existingOrders } = await supabase
                .from('orders')
                .select('id')
                .eq('table_id', tableId)
                .eq('establishment_id', establishmentId)
                .neq('status', 'cancelled')
                .not('status', 'ilike', 'archived%')
                .limit(1);

            if (existingOrders && existingOrders.length > 0) {
                orderId = existingOrders[0].id;
            } else {
                const { data: newOrder, error } = await supabase.from('orders').insert({
                    table_id: tableId,
                    status: 'pending',
                    customer_name: 'Adicionado pelo Garçom',
                    establishment_id: establishmentId
                }).select('id').single();
                if (error) throw error;
                if (newOrder) orderId = newOrder.id;
            }

            if (!orderId) throw new Error('Não foi possível identificar o pedido da mesa');

            // 2. Resolve Rodizio Menu Items
            const suffix = establishmentId.slice(0, 5);
            const adultCode = `SYS01-${suffix}`;
            const childCode = `SYS02-${suffix}`;

            const { data: sysItems } = await supabase
                .from('menu_items')
                .select('id, code, price')
                .ilike('code', 'SYS%')
                .eq('establishment_id', establishmentId);

            const adultItem = sysItems?.find(i => i.code === adultCode || i.code === 'SYS01');
            const childItem = sysItems?.find(i => i.code === childCode || i.code === 'SYS02');

            if (!adultItem && rodizioAdults > 0) throw new Error('Item de sistema SYS01 não encontrado. Avise o admin para configurar.');
            if (!childItem && rodizioChildren > 0) throw new Error('Item de sistema SYS02 não encontrado. Avise o admin para configurar.');

            // 3. Insert items
            const orderItems = [];
            if (rodizioAdults > 0 && adultItem) {
                orderItems.push({
                    order_id: orderId,
                    item_id: adultItem.id,
                    quantity: rodizioAdults,
                    status: 'completed',
                    price: adultItem.price || 129.99
                });
            }
            if (rodizioChildren > 0 && childItem) {
                orderItems.push({
                    order_id: orderId,
                    item_id: childItem.id,
                    quantity: rodizioChildren,
                    status: 'completed',
                    price: childItem.price || 69.99
                });
            }

            if (orderItems.length > 0) {
                const { error: insertError } = await supabase.from('order_items').insert(orderItems);
                if (insertError) throw insertError;
            }

            toast.success('Rodízio adicionado com sucesso!');
            setRodizioAdults(0);
            setRodizioChildren(0);
            fetchData(); // Refresh everything
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Erro ao adicionar rodízio');
        } finally {
            setIsSavingRodizio(false);
        }
    };

    const getTableOrders = (id: string) => orders.filter(o => o.table_id === id && !['cancelled', 'archived'].includes(o.status));
    const getTableTotal = (id: string) => getTableOrders(id).reduce((acc, o) => acc + (o.total_amount || o.order_items?.reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0) || 0), 0);

    // Filter/Derived data
    const realTables = tables.filter(t => !t.id.startsWith('DIV_') && !t.id.startsWith('LABEL_'))
        .sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '')) || a.id.charCodeAt(0);
            const numB = parseInt(b.id.replace(/\D/g, '')) || b.id.charCodeAt(0);
            return numA - numB || a.id.localeCompare(b.id);
        });

    const filteredTables = realTables.filter(t => {
        if (filter === 'free') return t.status === 'free';
        if (filter === 'occupied') return t.status !== 'free';
        return true;
    });

    const freeCount = realTables.filter(t => t.status === 'free').length;
    const occupiedCount = realTables.length - freeCount;

    const averageTimeMs = occupiedCount > 0 
        ? realTables.filter(t => t.status !== 'free').reduce((acc, t) => acc + (currentTime - getOccupiedSince(t)), 0) / occupiedCount 
        : 0;
    const averageTimeMins = Math.floor(averageTimeMs / 60000);

    const qrUrl = selectedTable ? `${window.location.origin}/${slug}?q=${btoa(`ezmenu_tbl_${selectedTable.id}`)}` : '';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ─── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Mesas</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Gerencie a ocupação do salão em tempo real.</p>
                </div>
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Nova Mesa
                </button>
            </div>

            {/* ─── KPI Strip ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Mesas Livres',   value: freeCount,      color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
                    { label: 'Mesas Ocupadas', value: occupiedCount,   color: 'text-red-600',     bg: 'bg-red-50',     icon: Users },
                    { label: 'Tempo Médio',    value: `${averageTimeMins} min`, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                            <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-0.5">{kpi.label}</p>
                            <p className={`text-xl font-black tracking-tight ${kpi.color}`}>{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Filter Tabs ──────────────────────────────────────────────────── */}
            <div className="flex gap-2">
                {[
                    { id: 'all',      label: `Todas (${realTables.length})` },
                    { id: 'free',     label: `Livres (${freeCount})` },
                    { id: 'occupied', label: `Ocupadas (${occupiedCount})` },
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filter === f.id
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ─── Tables Grid ──────────────────────────────────────────────────── */}
            {filteredTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                    <Armchair className="w-10 h-10 mb-3 opacity-30" />
                    <p className="font-semibold text-sm">Nenhuma mesa encontrada</p>
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                        <button onClick={() => setIsAddOpen(true)} className="mt-4 flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-zinc-800 transition-all">
                            <Plus className="w-3.5 h-3.5" /> Criar Primeira Mesa
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filteredTables.map(table => {
                        const status = getStatus(table, orders, currentTime);
                        const cfg = STATUS[status] || STATUS.free;
                        const total = table.status !== 'free' ? getTableTotal(table.id) : 0;
                        const sinceMs = table.status !== 'free' ? currentTime - getOccupiedSince(table) : 0;
                        const isAlert = status === 'timeout' || (table.status !== 'free' && Math.floor(sinceMs / 60000) > 60);

                        return (
                            <button
                                key={table.id}
                                onClick={() => { setSelectedTable(table); setActiveTab('info'); }}
                                className={`relative group border-2 rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-sm ${cfg.card} ${isAlert ? 'ring-2 ring-red-400/40' : ''}`}
                            >
                                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${cfg.dot}`} />
                                <div className="mb-3">
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">Mesa</p>
                                    <p className="text-2xl font-black tracking-tight text-zinc-900 leading-none">{table.id}</p>
                                </div>
                                <div className="flex flex-col gap-1 mb-3">
                                    <div className="flex items-center gap-1 text-zinc-400">
                                        <Users className="w-3 h-3 shrink-0" />
                                        <span className="text-[11px] font-semibold">{table.seats} lugares</span>
                                    </div>
                                    {status !== 'free' && table.occupants && table.occupants.length > 0 && (
                                        <div className="flex items-center gap-1 text-blue-600 animate-in fade-in slide-in-from-left-1 duration-300">
                                            <div className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                                            <span className="text-[11px] font-bold tracking-tight">{table.occupants.length} {table.occupants.length === 1 ? 'pessoa' : 'pessoas'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${cfg.badge}`}>
                                    {cfg.label}
                                </div>
                                {table.status !== 'free' && (
                                    <div className="mt-2 flex items-center gap-1 text-zinc-500">
                                        <Clock className="w-3 h-3 shrink-0" />
                                        <span className="text-[11px] font-mono font-bold">{fmtDuration(sinceMs)}</span>
                                    </div>
                                )}
                                {total > 0 && (
                                    <div className="mt-1.5">
                                        <span className="text-[11px] font-bold text-zinc-700">R$ {total.toFixed(2)}</span>
                                    </div>
                                )}
                                <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ─── Add Table Dialog ─────────────────────────────────────────────── */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-sm rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-zinc-400" /> Nova Mesa
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-sm">Configure o identificador e capacidade.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Identificador da Mesa</Label>
                            <Input
                                placeholder="Ex: 1, A1, VIP..."
                                value={newTableName}
                                onChange={e => setNewTableName(e.target.value)}
                                className="h-11 rounded-xl border-zinc-200"
                                onKeyDown={e => e.key === 'Enter' && addTable()}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Capacidade (Lugares)</Label>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setNewTableSeats(Math.max(1, newTableSeats - 1))} className="h-11 w-11 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-all">-</button>
                                <Input type="number" value={newTableSeats} onChange={e => setNewTableSeats(parseInt(e.target.value) || 1)} className="h-11 rounded-xl text-center font-bold text-lg border-zinc-200" />
                                <button type="button" onClick={() => setNewTableSeats(newTableSeats + 1)} className="h-11 w-11 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 hover:bg-zinc-200 transition-all">+</button>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setIsAddOpen(false)} className="flex-1 h-11 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button onClick={addTable} className="flex-1 h-11 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors active:scale-95">Criar Mesa</button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Table Detail Panel ───────────────────────────────────────────── */}
            <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
                <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    {selectedTable && (() => {
                        const status = getStatus(selectedTable, orders, currentTime);
                        const cfg = STATUS[status] || STATUS.free;
                        const tOrders = selectedTable.status !== 'free' ? getTableOrders(selectedTable.id) : [];
                        const total = selectedTable.status !== 'free' ? getTableTotal(selectedTable.id) : 0;
                        const sinceMs = selectedTable.status !== 'free' ? currentTime - getOccupiedSince(selectedTable) : 0;
                        const allItems = tOrders.flatMap(o => (o.order_items || []).map((oi: any) => ({ ...oi, _orderAt: o.created_at, _customerName: o.customer_name })));

                        return (
                            <>
                                <div className="bg-zinc-900 px-8 py-6 relative overflow-hidden">
                                    <button onClick={() => setSelectedTable(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0">
                                            <Armchair className="w-7 h-7 text-zinc-300" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-2xl font-black text-white tracking-tight">Mesa {selectedTable.id}</DialogTitle>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${cfg.badge}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </div>
                                                {selectedTable.status !== 'free' && (
                                                    <div className="flex items-center gap-1 text-zinc-400 text-xs font-mono">
                                                        <Clock className="w-3.5 h-3.5" /> {fmtDuration(sinceMs)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <div className="bg-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2 font-bold text-xs text-zinc-300">
                                            <Users className="w-3.5 h-3.5 text-zinc-400" /> {selectedTable.seats} lugares
                                        </div>
                                        {total > 0 && (
                                            <div className="bg-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2 font-bold text-xs text-zinc-300">
                                                <Receipt className="w-3.5 h-3.5 text-zinc-400" /> R$ {total.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex border-b border-zinc-100 bg-white px-6">
                                    {(['info', 'orders'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                                        >
                                            {tab === 'info' ? 'Informações' : `Pedidos (${allItems.length})`}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-zinc-50 min-h-[200px] max-h-[50vh] overflow-y-auto">
                                    {activeTab === 'info' ? (
                                        <div className="p-6 space-y-4">
                                            <div className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-zinc-900 text-sm mb-0.5">QR Code da Mesa</h4>
                                                    <p className="text-xs text-zinc-400">Escaneie para acessar o menu</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div id={`qr-${selectedTable.id}`} className="hidden"><QRCodeSVG value={qrUrl} size={200} /></div>
                                                    <button onClick={() => downloadQR(selectedTable.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50"><Download className="w-4 h-4" /> QR</button>
                                                    <button onClick={() => setShowQr(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"><QrCode className="w-4 h-4" /> Ver</button>
                                                </div>
                                            </div>

                                            {(userRole === 'admin' || userRole === 'super_admin') && (
                                                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                                                    <h4 className="font-bold text-zinc-900 text-sm mb-3">Capacidade</h4>
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={async () => {
                                                            const n = Math.max(1, selectedTable.seats - 1);
                                                            await supabase.from('restaurant_tables').update({ seats: n }).eq('id', selectedTable.id);
                                                            setSelectedTable({ ...selectedTable, seats: n });
                                                            fetchData();
                                                        }} className="h-10 w-10 rounded-lg border border-zinc-200 flex items-center justify-center">-</button>
                                                        <div className="w-12 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-black">{selectedTable.seats}</div>
                                                        <button onClick={async () => {
                                                            const n = selectedTable.seats + 1;
                                                            await supabase.from('restaurant_tables').update({ seats: n }).eq('id', selectedTable.id);
                                                            setSelectedTable({ ...selectedTable, seats: n });
                                                            fetchData();
                                                        }} className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-900 hover:bg-zinc-200"><Plus className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm shadow-emerald-500/5">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-emerald-950 text-sm leading-none">Liberar Rodízio</h4>
                                                        <p className="text-[10px] text-emerald-700/80 mt-0.5">Adicione o pacote de rodízio à mesa</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Adultos</Label>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => setRodizioAdults(Math.max(0, rodizioAdults - 1))} className="h-10 w-10 rounded-xl border border-zinc-200 flex items-center justify-center">-</button>
                                                            <div className="h-10 flex-1 rounded-xl bg-zinc-50 flex items-center justify-center font-black text-zinc-900 border border-zinc-100">{rodizioAdults}</div>
                                                            <button onClick={() => setRodizioAdults(rodizioAdults + 1)} className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 hover:bg-emerald-200"><Plus className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Crianças</Label>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => setRodizioChildren(Math.max(0, rodizioChildren - 1))} className="h-10 w-10 rounded-xl border border-zinc-200 flex items-center justify-center">-</button>
                                                            <div className="h-10 flex-1 rounded-xl bg-zinc-50 flex items-center justify-center font-black text-zinc-900 border border-zinc-100">{rodizioChildren}</div>
                                                            <button onClick={() => setRodizioChildren(rodizioChildren + 1)} className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 hover:bg-orange-200"><Plus className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleAddRodizio(selectedTable.id)} 
                                                    disabled={isSavingRodizio || (rodizioAdults === 0 && rodizioChildren === 0)}
                                                    className="mt-4 w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl active:scale-95 transition-all"
                                                >
                                                    {isSavingRodizio ? 'Adicionando...' : 'Adicionar Rodízios'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 space-y-2">
                                            {allItems.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
                                                    <UtensilsCrossed className="w-8 h-8 mb-2" />
                                                    <p className="text-sm font-medium">Sem pedidos ativos</p>
                                                </div>
                                            ) : (
                                                allItems.map((item, idx) => (
                                                    <div key={idx} className="bg-white rounded-xl border border-zinc-100 px-4 py-3 flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-xs font-black text-zinc-700 shrink-0">{item.quantity}×</div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-zinc-800 truncate">{item.menu_items?.name}</p>
                                                            <p className="text-[10px] text-zinc-400 font-medium">
                                                                {new Date(item._orderAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                {item._customerName && ` · ${item._customerName}`}
                                                            </p>
                                                        </div>
                                                        <span className="text-sm font-bold text-zinc-700 shrink-0">R$ {(Number(item.price) * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white border-t border-zinc-100 px-6 py-4 flex items-center justify-between">
                                    <div className="flex gap-2">
                                        {(userRole === 'admin' || userRole === 'super_admin') && (
                                            <button onClick={() => deleteTable(selectedTable.id)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-red-100 text-red-500 text-xs font-bold hover:bg-red-50"><Trash2 className="w-4 h-4" /> Remover</button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setSelectedTable(null)} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600">Fechar</button>
                                        {selectedTable.status !== 'free' && (
                                            <button onClick={() => releaseTable(selectedTable.id)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold active:scale-95 transition-all"><LogOut className="w-4 h-4" /> Liberar Mesa</button>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <Dialog open={showQr} onOpenChange={setShowQr}>
                <DialogContent className="max-w-xs rounded-2xl p-8 text-center">
                    <DialogTitle className="text-xl font-bold mb-2">Mesa {selectedTable?.id}</DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400 mb-5 break-all">{qrUrl}</DialogDescription>
                    <div className="flex justify-center mb-5"><QRCodeSVG value={qrUrl} size={220} /></div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowQr(false)} className="flex-1 h-11 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600">Fechar</button>
                        <button onClick={() => { if (selectedTable) downloadQR(selectedTable.id); }} className="flex-1 h-11 rounded-xl bg-zinc-900 text-white text-sm font-semibold flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Baixar</button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
