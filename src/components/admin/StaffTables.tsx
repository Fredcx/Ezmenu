import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
    Users, Clock, Receipt, Armchair, 
    Trash2, ChevronRight, CheckCircle2, 
    CreditCard, Banknote, Utensils, X, Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface TableData {
    id: string;
    seats: number;
    status: 'free' | 'occupied' | 'waiting_payment' | 'ordered' | 'eating' | 'cleaning' | 'timeout';
    last_activity_at: string | null;
    occupants?: any[];
}

export function StaffTables() {
    const { slug } = useParams();
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [tables, setTables] = useState<TableData[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(Date.now());
    
    // UI State
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
    const [showCheckout, setShowCheckout] = useState(false);
    const [showRodizioModal, setShowRodizioModal] = useState(false);
    const [menuSearch, setMenuSearch] = useState('');
    const [confirmCheckoutMethod, setConfirmCheckoutMethod] = useState<'credit' | 'debit' | 'cash' | 'app' | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

            const [tablesRes, ordersRes, menuRes] = await Promise.all([
                 supabase.from('restaurant_tables').select('*').eq('establishment_id', currentId).is('is_label', false),
                 supabase.from('orders').select('*, order_items(*, menu_items(*))').eq('establishment_id', currentId).neq('status', 'cancelled').not('status', 'ilike', 'archived%'),
                 supabase.from('menu_items').select('*, categories(id, name)').eq('establishment_id', currentId).order('name')
            ]);

            if (tablesRes.data) {
                setTables(tablesRes.data.map(t => ({
                    id: t.id, seats: t.seats, status: t.status || 'free',
                    last_activity_at: t.last_activity_at, occupants: t.occupants || []
                })));
            }
            if (ordersRes.data) setOrders(ordersRes.data);
            if (menuRes.data) setMenuItems(menuRes.data);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        fetchData();
        if (establishmentId) {
            const channel = supabase.channel(`staff_sync_${establishmentId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `establishment_id=eq.${establishmentId}` }, fetchData)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` }, fetchData)
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [establishmentId, slug]);

    // Helpers
    const getTableMetrics = (tableId: string) => {
        const table = tables.find(t => t.id === tableId);
        if (!table || table.status === 'free') return null;

        const tableOrders = orders.filter(o => o.table_id === tableId && !(o.status === 'cancelled' || o.status?.startsWith('archived')));
        const satDownAt = table.last_activity_at ? new Date(table.last_activity_at).getTime() : currentTime;
        
        let total = 0;
        let activeItems = 0;

        tableOrders.forEach(o => {
            (o.order_items || []).forEach((i: any) => {
                if (i.status !== 'cancelled') {
                    total += (Number(i.price) * i.quantity);
                    activeItems++;
                }
            });
        });

        return { satDownAt, durationMins: Math.floor((currentTime - satDownAt) / 60000), total, orderCount: activeItems };
    };

    const getOrderedItems = (tableId: string) => {
        const tableOrders = orders.filter(o => o.table_id === tableId && !(o.status === 'cancelled' || o.status?.startsWith('archived')));
        const allItems: any[] = [];
        tableOrders.forEach(o => {
            (o.order_items || []).forEach((oi: any) => {
                allItems.push({ ...oi, _orderId: o.id, _time: o.created_at, _author: o.customer_name || 'Mesa' });
            });
        });
        return allItems.sort((a, b) => new Date(b._time).getTime() - new Date(a._time).getTime());
    };

    // Actions
    const cancelOrderItem = async (itemId: string, orderId: string) => {
        if (!confirm('Deseja cancelar (debitar) este item da conta?')) return;
        try {
            await supabase.from('order_items').update({ status: 'cancelled' }).eq('id', itemId);
            toast.success('Item removido da conta');
            fetchData();
        } catch {
            toast.error('Erro ao cancelar item');
        }
    };

    const addManualRodizio = async (menuItem: any, qty: number) => {
        if (qty <= 0) return;
        try {
            let activeOrder = orders.find(o => o.table_id === selectedTableId && !(o.status === 'cancelled' || o.status === 'completed' || o.status === 'paid' || o.status?.startsWith('archived')));
            let orderId = activeOrder?.id;

            if (!activeOrder) {
                const { data, error } = await supabase.from('orders').insert({
                    establishment_id: establishmentId,
                    table_id: selectedTableId,
                    status: 'pending',
                    customer_name: 'Garçom (Lançamento)',
                    total_amount: 0
                }).select('id').single();
                if (error) throw error;
                orderId = data.id;
            }

            const { error: itemErr } = await supabase.from('order_items').insert({
                order_id: orderId,
                item_id: menuItem.id,
                quantity: qty,
                price: menuItem.price,
                status: 'pending',
                observation: ''
            });

            if (itemErr) throw itemErr;

            await supabase.from('restaurant_tables').update({ 
                status: 'occupied',
                last_activity_at: new Date().toISOString()
            }).eq('id', selectedTableId);
            
            toast.success(`${qty}x ${menuItem.name} adicionado!`);
            setShowRodizioModal(false);
            fetchData();
        } catch (e) {
            toast.error('Erro ao lançar item');
        }
    };

    const completeCheckout = async (method: 'credit' | 'debit' | 'cash' | 'app') => {
        if (!selectedTableId) return;
        try {
            const tableOrders = orders.filter(o => o.table_id === selectedTableId && !(o.status === 'cancelled' || o.status?.startsWith('archived')));
             if (tableOrders.length > 0) {
                 const orderIds = tableOrders.map(o => o.id);
                 await supabase.from('orders').update({ status: `archived_${method}`, completed_at: new Date().toISOString() }).in('id', orderIds);
                 await supabase.from('order_items').update({ status: 'ready' }).in('order_id', orderIds).neq('status', 'ready').neq('status', 'cancelled');
             }
 
             await supabase.from('restaurant_tables').update({ status: 'free', last_activity_at: null, occupants: [] }).eq('id', selectedTableId);
             if (establishmentId) {
                await supabase.from('service_requests').update({ status: 'archived' }).eq('table_id', selectedTableId).eq('establishment_id', establishmentId);
             }
             
             toast.success(`Mesa ${selectedTableId} paga via ${method}! Encerrada.`);
             setSelectedTableId(null);
             setShowCheckout(false);
             setConfirmCheckoutMethod(null);
             fetchData();
        } catch (e) {
            toast.error('Erro ao encerrar mesa');
        }
    };

    const selectedTable = tables.find(t => t.id === selectedTableId);
    const metrics = selectedTableId ? getTableMetrics(selectedTableId) : null;
    const items = selectedTableId ? getOrderedItems(selectedTableId) : [];
    const uniqueCustomers = Array.from(new Set(items.map(i => i._author))).filter(c => c && c !== 'Garçom (Lançamento)' && c !== 'Mesa');

    // Filter out old tables
    const displayTables = tables.filter(t => !t.id.startsWith('DIV_') && !t.id.startsWith('LABEL_')).sort((a,b) => {
        const numA = parseInt(a.id.replace(/\D/g, '')) || a.id.charCodeAt(0);
        const numB = parseInt(b.id.replace(/\D/g, '')) || b.id.charCodeAt(0);
        return numA - numB || a.id.localeCompare(b.id);
    });

    return (
        <div className="relative">
            {/* Grid */}
            <div className="grid grid-cols-2 gap-3 pb-24">
                {displayTables.map(table => {
                    const isOccupied = table.status !== 'free';
                    const m = getTableMetrics(table.id);
                    const isAlert = table.status === 'timeout' || table.status === 'waiting_payment';

                    return (
                        <button
                            key={table.id}
                            onClick={() => { setSelectedTableId(table.id); setActiveTab('info'); }}
                            className={`text-left relative p-4 rounded-3xl border transition-all active:scale-95 shadow-sm overflow-hidden min-h-[110px] flex flex-col justify-between ${
                                isOccupied ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-200'
                            } ${isAlert ? 'ring-4 ring-amber-400/30' : ''}`}
                        >
                            <div className="flex justify-between items-start w-full">
                                <div>
                                    <h3 className={`text-xl font-black tracking-tight leading-none ${isOccupied ? 'text-white' : 'text-zinc-900'}`}>
                                        M-{table.id}
                                    </h3>
                                </div>
                                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                                    isAlert ? 'bg-amber-400 animate-pulse' : 
                                    isOccupied ? 'bg-red-500' : 'bg-emerald-400'
                                }`} />
                            </div>

                            {isOccupied && m ? (
                                <div className="mt-2 w-full">
                                    <p className="text-zinc-400 font-mono text-xs">{m.durationMins}m</p>
                                    <p className="text-white font-bold tracking-tight text-lg mt-0.5">R$ {m.total.toFixed(2)}</p>
                                </div>
                            ) : (
                                <div className="mt-auto w-full flex items-center gap-1.5 text-zinc-400">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">{table.seats}</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Table Detail Modal (Fullscreen for Mobile) */}
            {selectedTableId && selectedTable && (
                <div className="fixed inset-0 z-[100] bg-zinc-50 flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    
                    {/* Dark Header */}
                    <header className="bg-zinc-900 px-5 pt-8 pb-5 flex items-start justify-between shrink-0 relative overflow-hidden rounded-b-3xl shadow-lg">
                        <div className="flex gap-4 items-center relative z-10 w-full">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner ${selectedTable.status === 'free' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'}`}>
                                <Armchair className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest leading-none ${selectedTable.status === 'free' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {selectedTable.status === 'free' ? 'Livre' : 'Ocupada'}
                                    </span>
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tighter truncate">Mesa {selectedTable.id}</h3>
                            </div>
                            <button onClick={() => { setSelectedTableId(null); setShowCheckout(false); setShowRodizioModal(false); setConfirmCheckoutMethod(null); setMenuSearch(''); setSelectedCategory(null); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 active:scale-95 transition-transform">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    {selectedTable.status !== 'free' && metrics ? (
                        <div className="flex-1 flex flex-col overflow-hidden pb-safe">
                            <div className="flex px-4 pt-4 shrink-0">
                                <div className="bg-zinc-200/50 p-1 rounded-xl flex w-full">
                                    <button onClick={() => setActiveTab('info')} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'info' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Conta</button>
                                    <button onClick={() => setActiveTab('orders')} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Histórico</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 content-area">
                                {activeTab === 'info' ? (
                                    <div className="space-y-4">
                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 flex flex-col items-center text-center">
                                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total da Mesa</p>
                                            <p className="text-5xl font-black text-zinc-900 tracking-tighter">R$ {metrics.total.toFixed(2)}</p>
                                            <div className="flex items-center gap-3 mt-4">
                                                <div className="flex items-center gap-1.5 text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg text-xs font-bold">
                                                    <Clock className="w-3.5 h-3.5" /> {metrics.durationMins} min
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg text-xs font-bold">
                                                    <Utensils className="w-3.5 h-3.5" /> {metrics.orderCount} itens
                                                </div>
                                            </div>
                                        </div>

                                        {uniqueCustomers.length > 0 && (
                                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100">
                                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 text-center">Contas Conectadas</h4>
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    {uniqueCustomers.map((c, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold text-zinc-700">
                                                            <Users className="w-3.5 h-3.5 text-zinc-400" />
                                                            {c as string}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button 
                                            onClick={() => setShowRodizioModal(true)}
                                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-100 text-zinc-900 font-bold border border-zinc-200 active:scale-95 transition-transform"
                                        >
                                            <Plus className="w-5 h-5" /> Lançar Item / Rodízio
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 pb-6">
                                        {items.map((item, idx) => (
                                            <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${item.status === 'cancelled' ? 'bg-red-50 border-red-100 opacity-60' : 'bg-white border-zinc-100 shadow-sm'}`}>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${item.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-700'}`}>
                                                    {item.quantity}x
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-bold text-sm truncate ${item.status === 'cancelled' ? 'line-through text-red-500' : 'text-zinc-900'}`}>{item.menu_items?.name}</p>
                                                    <p className="text-[10px] text-zinc-400 font-bold">R$ {(item.price * item.quantity).toFixed(2)} · {new Date(item._time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · <span className="text-zinc-600">{item._author}</span></p>
                                                </div>
                                                {item.status !== 'cancelled' && (
                                                    <button 
                                                        onClick={() => cancelOrderItem(item.id, item._orderId)}
                                                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 active:scale-95 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {item.status === 'cancelled' && (
                                                    <span className="text-[9px] font-black uppercase text-red-500">Estornado</span>
                                                )}
                                            </div>
                                        ))}
                                        {items.length === 0 && (
                                            <p className="text-center text-zinc-400 text-sm py-10 font-medium">Nenhum item lançado</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Checkout Footer Bar */}
                            <div className="bg-white border-t border-zinc-200 p-4 shrink-0 pb-safe">
                                <button 
                                    onClick={() => setShowCheckout(true)}
                                    className="w-full bg-emerald-500 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-2 text-base active:scale-95 transition-transform shadow-lg shadow-emerald-500/20"
                                >
                                    <CheckCircle2 className="w-6 h-6" /> Fechar Conta (R$ {metrics.total.toFixed(2)})
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                            <div className="w-24 h-24 bg-zinc-100 text-zinc-300 rounded-[2rem] flex items-center justify-center shadow-inner">
                                <Armchair className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight text-zinc-900 mb-2">Mesa Livre</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed">Aguarde os clientes escanearem o QR Code ou adicione um rodízio manualmente para abrir a mesa.</p>
                            </div>
                            <button 
                                onClick={() => setShowRodizioModal(true)}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-900 text-white font-bold active:scale-95 transition-transform shadow-sm"
                            >
                                <Plus className="w-5 h-5" /> Iniciar Mesa (Lançar Rodízio)
                            </button>
                            <button onClick={() => setSelectedTableId(null)} className="w-full py-4 text-xs font-bold text-zinc-500">Voltar ao Mapa</button>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Throw Modal */}
            {showRodizioModal && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white w-full sm:w-[400px] h-[80vh] sm:h-[600px] sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
                            <h4 className="font-black text-lg text-zinc-900">Lançar Item</h4>
                            <button onClick={() => { setShowRodizioModal(false); setMenuSearch(''); setSelectedCategory(null); }} className="p-2 bg-white rounded-full border border-zinc-200 text-zinc-500"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-5 pt-4 pb-2 border-b border-zinc-100 bg-white shrink-0">
                            <input 
                                type="text" 
                                placeholder="Buscar itens ex: Coca, Sushi..." 
                                value={menuSearch}
                                onChange={e => setMenuSearch(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                            />
                        </div>
                        
                        {(() => {
                            const allCategories = Array.from(new Set(menuItems.map(m => Array.isArray(m.categories) ? m.categories[0]?.name : m.categories?.name).filter(Boolean)));
                            return (
                                <>
                                    {!menuSearch && allCategories.length > 0 && (
                                        <div className="flex overflow-x-auto gap-2 px-5 py-3 border-b border-zinc-100 bg-zinc-50 hide-scrollbar shrink-0">
                                            <button 
                                                onClick={() => setSelectedCategory(null)}
                                                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${!selectedCategory ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600'}`}
                                            >
                                                Principais
                                            </button>
                                            {allCategories.map(cat => (
                                                <button 
                                                    key={cat as string}
                                                    onClick={() => setSelectedCategory(cat as string)}
                                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600'}`}
                                                >
                                                    {cat as string}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1 mb-2">{menuSearch ? 'Resultados da Pesquisa' : (selectedCategory || 'Rodízios Adicionais')}</p>
                                        {(() => {
                                            const filtered = menuItems.filter(m => {
                                                if (menuSearch) return m.name.toLowerCase().includes(menuSearch.toLowerCase());
                                                if (selectedCategory) {
                                                    const cName = Array.isArray(m.categories) ? m.categories[0]?.name : m.categories?.name;
                                                    return cName === selectedCategory;
                                                }
                                                return m.code?.startsWith('SYS');
                                            });
                                            if (filtered.length === 0) return <p className="text-center text-zinc-400 text-sm py-10 font-medium">Nenhum item encontrado.</p>;
                                            return filtered.map(m => (
                                                <div key={m.id} className="bg-white border border-zinc-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                                                    <div>
                                                        <p className="font-bold text-sm text-zinc-900">{m.name}</p>
                                                        <p className="text-emerald-600 font-bold text-xs">R$ {m.price.toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => addManualRodizio(m, 1)} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform">+ 1</button>
                                                        <button onClick={() => addManualRodizio(m, 2)} className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-xl text-xs font-bold active:scale-95 transition-transform">+ 2</button>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white w-full sm:w-[360px] p-6 sm:rounded-3xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="font-black text-2xl text-zinc-900 mb-1">Pagamento</h4>
                                <p className="text-sm font-bold text-zinc-500">Mesa {selectedTableId}</p>
                            </div>
                            <button onClick={() => { setShowCheckout(false); setConfirmCheckoutMethod(null); }} className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded-full text-zinc-500"><X className="w-4 h-4" /></button>
                        </div>
                        
                        <div className="bg-zinc-50 rounded-2xl p-5 mb-6 text-center border border-zinc-200">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total a cobrar</p>
                            <p className="text-4xl font-black text-emerald-600 tracking-tighter">R$ {metrics?.total.toFixed(2)}</p>
                        </div>

                        {!confirmCheckoutMethod ? (
                            <div className="space-y-3">
                                <button onClick={() => setConfirmCheckoutMethod('credit')} className="w-full flex items-center gap-4 bg-white border-2 border-zinc-200 p-4 rounded-2xl hover:border-zinc-900 active:scale-95 transition-all text-left">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 shrink-0"><CreditCard className="w-6 h-6" /></div>
                                    <div><p className="font-black text-zinc-900 text-lg">Maquininha</p><p className="text-xs font-bold text-zinc-500">Crédito ou Débito</p></div>
                                </button>
                                <button onClick={() => setConfirmCheckoutMethod('cash')} className="w-full flex items-center gap-4 bg-white border-2 border-zinc-200 p-4 rounded-2xl hover:border-zinc-900 active:scale-95 transition-all text-left">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><Banknote className="w-6 h-6" /></div>
                                    <div><p className="font-black text-zinc-900 text-lg">Dinheiro</p><p className="text-xs font-bold text-zinc-500">Pagamento em espécie</p></div>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-red-50 text-red-900 p-4 rounded-2xl text-center mb-4 border border-red-100">
                                    <p className="font-bold text-sm">Tem certeza?</p>
                                    <p className="text-xs mt-1">Ao confirmar, a conta será fechada como paga via {confirmCheckoutMethod === 'credit' ? 'Maquininha' : 'Dinheiro'}. Esta ação não pode ser desfeita!</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setConfirmCheckoutMethod(null)} className="flex-1 py-3.5 rounded-xl border-2 border-zinc-200 text-zinc-600 font-bold active:scale-95 transition-transform bg-white">Cancelar</button>
                                    <button onClick={() => completeCheckout(confirmCheckoutMethod)} className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">Sim, Fechar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
