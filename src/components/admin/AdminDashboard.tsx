import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
    DollarSign, ShoppingBag, Users, TrendingUp, TrendingDown,
    Clock, AlertTriangle, CheckCircle, Database, Package,
    Loader2, ArrowUpRight, ArrowDownRight, Coffee, XCircle, Calculator
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { toast } from 'sonner';

export function AdminDashboard() {
    const { slug } = useParams();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        lastWeekRevenue: 0,
        revenueGrowth: 0,
        totalOrders: 0,
        activeTables: 0,
        totalTablesCount: 0,
        tableOccupancy: 0,
        ticketMedia: 0,
        cmvEstimado: 0,
        cancelledLosses: 0,
        mesasParadas: 0,
        kdsAvgTime: 0
    });
    
    const [speedData, setSpeedData] = useState<{ time: string; avgMinutes: number; count: number; status: 'good' | 'warning' | 'critical' }[]>([]);
    const [topItems, setTopItems] = useState<{ name: string; quantity: number; total: number; stockAlert: boolean }[]>([]);
    const [hourlyRevenue, setHourlyRevenue] = useState<{ hour: string; revenue: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            setIsLoading(true);
            try {
                const { data: est } = await supabase.from('establishments').select('id').eq('slug', slug).single();
                if (!est) return;

                // Dates calculation
                const now = new Date();
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                
                const lastWeekMidnight = new Date(todayMidnight);
                lastWeekMidnight.setDate(todayMidnight.getDate() - 7);
                const lastWeekEnd = new Date(lastWeekMidnight);
                lastWeekEnd.setHours(23, 59, 59, 999);

                // Parallel fetches
                const [ordersRes, lastWeekRes, tablesRes] = await Promise.all([
                    supabase.from('orders')
                        .select('*, order_items(*, menu_items(*))')
                        .eq('establishment_id', est.id)
                        .gte('created_at', todayMidnight.toISOString()),
                    supabase.from('orders')
                        .select('*, order_items(*, menu_items(*))')
                        .eq('establishment_id', est.id)
                        .gte('created_at', lastWeekMidnight.toISOString())
                        .lt('created_at', lastWeekEnd.toISOString()),
                    supabase.from('restaurant_tables')
                        .select('*')
                        .eq('establishment_id', est.id)
                        .is('is_label', false)
                ]);

                const todayOrders = ordersRes.data || [];
                const lastWeekOrders = lastWeekRes.data || [];
                const allTables = tablesRes.data || [];

                // Valid orders (not cancelled)
                const validOrders = todayOrders.filter(o => o.status !== 'cancelled');
                
                // Revenue Hoje
                const totalRevenue = validOrders.reduce((acc, o) => {
                    const t = o.total_amount ?? (o.order_items || [])
                          .filter((oi:any) => oi.status !== 'cancelled')
                          .reduce((s: number, oi: any) => s + Number(oi.price) * oi.quantity, 0);
                    return acc + Number(t);
                }, 0);

                // Revenue D-7
                const lastWeekRev = lastWeekOrders.filter(o => o.status !== 'cancelled').reduce((acc, o) => {
                    const t = o.total_amount ?? (o.order_items || [])
                          .filter((oi:any) => oi.status !== 'cancelled')
                          .reduce((s: number, oi: any) => s + Number(oi.price) * oi.quantity, 0);
                    return acc + Number(t);
                }, 0);

                const growth = lastWeekRev > 0 ? ((totalRevenue - lastWeekRev) / lastWeekRev) * 100 : 100;

                // Tables logic
                const activeTables = allTables.filter(t => t.status !== 'free').length;
                const occPercentage = allTables.length > 0 ? Math.round((activeTables / allTables.length) * 100) : 0;
                
                let paradas = 0;
                let cancelledLost = 0;
                
                // Paradas: > 30 mins inactive
                for (const t of allTables) {
                    if (t.status !== 'free' && t.last_activity_at) {
                        const mins = (now.getTime() - new Date(t.last_activity_at).getTime()) / 60000;
                        if (mins > 30) paradas++;
                    }
                }

                // Top Items & Cancelled
                const qMap = new Map<string, { name: string; quantity: number; total: number; stockAlert: boolean }>();
                
                todayOrders.forEach(o => {
                    (o.order_items || []).forEach((oi: any) => {
                        const priceTotal = (Number(oi.price) || 0) * oi.quantity;
                        if (oi.status === 'cancelled') {
                             cancelledLost += priceTotal;
                        } else {
                             const n = oi.menu_items?.name; 
                             if (!n) return;
                             const ex = qMap.get(n);
                             if (ex) { 
                                 ex.quantity += oi.quantity; 
                                 ex.total += priceTotal;
                                 if (ex.quantity > 30) ex.stockAlert = true; // Placeholder rule for stock risk
                             } else { 
                                 qMap.set(n, { name: n, quantity: oi.quantity, total: priceTotal, stockAlert: false });
                             }
                        }
                    });
                });
                
                // Speed Data & KDS
                // estimating avg KDS prep time from items not ready yet, or total order time.
                let totalPrepTime = 0;
                let prepCount = 0;
                
                const buckets = Array.from({ length: 61 }, (_, i) => {
                    const t = new Date(now.getTime() - (60 - i) * 60000);
                    const next = new Date(t.getTime() + 60000);
                    const m = validOrders.filter(o => { 
                        const ts = new Date(o.created_at).getTime(); 
                        return ts >= t.getTime() && ts < next.getTime(); 
                    });
                    
                    const avg = m.length > 0 ? m.reduce((a, o) => {
                        const dt = ((o.completed_at ? new Date(o.completed_at).getTime() : now.getTime()) - new Date(o.created_at).getTime()) / 60000;
                        return a + dt;
                    }, 0) / m.length : 0;

                    if (avg > 0) { totalPrepTime+= avg; prepCount++; }

                    // KDS Limit Check
                    const status: 'good' | 'warning' | 'critical' = avg >= 20 ? 'critical' : avg >= 15 ? 'warning' : 'good';
                    return { time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), avgMinutes: Math.floor(avg), count: m.length, status };
                });

                setSpeedData(buckets);

                // Hourly Revenue
                const hourly = Array.from({ length: 24 }, (_, h) => {
                    const rev = validOrders.filter(o => new Date(o.created_at).getHours() === h)
                        .reduce((a, o) => a + (o.total_amount || (o.order_items || [])
                            .filter((oi:any) => oi.status !== 'cancelled')
                            .reduce((s: number, oi: any) => s + Number(oi.price) * oi.quantity, 0)), 0);
                    return { hour: `${h}h`, revenue: rev };
                }).filter(h => h.revenue > 0 || (parseInt(h.hour) >= 10 && parseInt(h.hour) <= 23));

                setHourlyRevenue(hourly);
                setTopItems(Array.from(qMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5));

                setStats({
                    totalRevenue,
                    lastWeekRevenue: lastWeekRev,
                    revenueGrowth: growth,
                    totalOrders: validOrders.length,
                    activeTables,
                    totalTablesCount: allTables.length,
                    tableOccupancy: occPercentage,
                    ticketMedia: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
                    cmvEstimado: totalRevenue * 0.30,
                    cancelledLosses: cancelledLost,
                    mesasParadas: paradas,
                    kdsAvgTime: prepCount > 0 ? Math.round(totalPrepTime/prepCount) : 0
                });

            } catch (e) { console.error(e); }
            finally { setIsLoading(false); }
        };
        fetchDashboard();
        
        // Listeners for real-time dashboard tracking
        const channel = supabase.channel('dashboard_metrics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchDashboard)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, fetchDashboard)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [slug]);

    const isKdsCritical = stats.kdsAvgTime >= 20;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-zinc-900 text-white text-xs font-bold rounded-xl shadow-2xl px-3 py-2 border border-zinc-700">
                <p className="text-zinc-400 uppercase tracking-wider mb-1 text-[9px]">{label}</p>
                <p>R$ {Number(payload[0]?.value || 0).toFixed(2)}</p>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Visão Geral</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Indicadores chave de performance em tempo real.</p>
                </div>
            </div>

            {/* KDS Critical Alert Placeholder */}
            {isKdsCritical && (
                <div className="bg-red-600 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-red-600/20 text-white animate-pulse">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6" />
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-wider">Atenção: Gargalo na Cozinha</h3>
                            <p className="text-xs font-medium text-red-200 mt-0.5">Tempo médio de preparo do KDS ultrapassou 20 minutos.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Mesas Paradas Alert Placeholder */}
            {stats.mesasParadas > 0 && (
                <div className="bg-amber-100 rounded-2xl p-4 flex items-center justify-between border border-amber-200">
                    <div className="flex items-center gap-3">
                        <Coffee className="w-5 h-5 text-amber-600" />
                        <div>
                            <h3 className="font-bold text-sm text-amber-900">Mesas Paradas ({stats.mesasParadas})</h3>
                            <p className="text-xs text-amber-700 mt-0.5">Você possui mesas sem novos pedidos há mais de 30 minutos.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Primary KPIs Deck */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ocupação */}
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 hover:border-zinc-300 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{stats.tableOccupancy}%</span>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Ocupação</p>
                    <p className="text-2xl font-black text-zinc-900">{stats.activeTables} / {stats.totalTablesCount}</p>
                </div>

                {/* Faturamento com D-7 */}
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 hover:border-zinc-300 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        {stats.revenueGrowth >= 0 ? (
                             <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                             <ArrowDownRight className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Faturamento (Hoje)</p>
                    <p className="text-2xl font-black text-zinc-900">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className={`text-[10px] font-bold mt-1.5 ${stats.revenueGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}% vs. D-7 (Semana passada)
                    </p>
                </div>

                {/* Ticket Médio */}
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 hover:border-zinc-300 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Ticket Médio Real</p>
                    <p className="text-2xl font-black text-zinc-900">R$ {stats.ticketMedia.toFixed(2)}</p>
                    <p className="text-[10px] font-medium text-zinc-400 mt-1.5">Baseado em {stats.totalOrders} saídas</p>
                </div>

                {/* CMV */}
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 hover:border-zinc-300 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
                            <Calculator className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">CMV Estimado (30%)</p>
                    <p className="text-2xl font-black text-zinc-900">R$ {stats.cmvEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] font-medium text-zinc-400 mt-1.5">Custo mercadoria dia</p>
                </div>
            </div>

            {/* Sec. Deck - Cancelamentos & Estoque */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Controle de Vendas & Estoque (Left) */}
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6">
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2 mb-6">
                        <ShoppingBag className="w-4 h-4 text-zinc-400" /> Histórico de Saída (Estoque KDS)
                    </h3>
                    <div className="space-y-4">
                        {topItems.map((item, i) => {
                            const maxQty = topItems[0]?.quantity || 1;
                            return (
                                <div key={i} className="flex items-center gap-4">
                                    <span className="w-6 h-6 rounded bg-zinc-100 text-zinc-600 flex items-center justify-center text-xs font-black">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                                            {item.name} 
                                            {item.stockAlert && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded uppercase flex items-center gap-1"><Package className="w-2.5 h-2.5"/> Atenção</span>}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-700 ${item.stockAlert ? 'bg-red-500' : 'bg-zinc-900'}`} style={{ width: `${(item.quantity / maxQty) * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] font-black text-zinc-400">{item.quantity} un.</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-zinc-900 w-16 text-right">R$ {item.total.toFixed(0)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Cancelamentos & Gráfico Vel/Hora (Right) */}
                <div className="flex flex-col gap-4">
                    {/* Custo de Cancelamento Card */}
                    <div className="bg-white rounded-3xl border border-red-50 shadow-sm p-6 flex justify-between items-center bg-gradient-to-r from-white to-red-50/50">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <h3 className="font-bold text-sm text-red-900">Custo Absoluto de Cancelamentos</h3>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium">Perda estimada por itens devolvidos/cancelados hoje.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-red-600">
                                R$ {stats.cancelledLosses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Gráfico de Faturamento/Hora */}
                    <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 flex-1">
                        <h3 className="font-bold text-zinc-900 flex items-center gap-2 mb-5 text-sm">
                            <TrendingUp className="w-4 h-4 text-zinc-400" /> Distribuição de Receita (Hora)
                        </h3>
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hourlyRevenue} margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
                                    <defs>
                                        <linearGradient id="revHGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="revenue" stroke="#18181b" strokeWidth={3} fill="url(#revHGrad)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-4 py-8 opacity-40">
                <div className="h-px bg-zinc-300 flex-1" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Ez Menu Operational</span>
                <div className="h-px bg-zinc-300 flex-1" />
            </div>
        </div>
    );
}
