import { useState, useEffect } from 'react';
import {
    DollarSign, ShoppingBag, Users, TrendingUp, Clock,
    AlertTriangle, CheckCircle, Database, Loader2,
    ArrowUpRight, ArrowDownRight, Info, Target
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { CustomerTurnoverChart } from './CustomerTurnoverChart';
import { Button } from '@/components/ui/button';
import { seedDatabase } from '@/lib/seed';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function AdminDashboard() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        activeTables: 1,
        alacarteTicket: 0,
        estimatedProfit: 0
    });

    // Speed Data represents minute-by-min of last hour
    const [speedData, setSpeedData] = useState<{ time: string, avgMinutes: number, count: number, status: 'good' | 'warning' | 'critical' }[]>([]);
    const [topItems, setTopItems] = useState<{ name: string; quantity: number; total: number }[]>([]);
    const [hourlyRevenue, setHourlyRevenue] = useState<{ hour: string, revenue: number }[]>([]);
    const [isSeeding, setIsSeeding] = useState(false);

    const COLORS = ['#ed1b2e', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3'];

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const success = await seedDatabase();
            if (success) {
                toast.success('Dados migrados com sucesso para o Supabase!');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao migrar dados.');
        } finally {
            setIsSeeding(false);
        }
    };

    useEffect(() => {
        const calculateStats = async () => {
            try {
                // 1. Fetch Orders for today
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select('*, order_items(*, menu_items(*))')
                    .gte('created_at', today.toISOString())
                    .neq('status', 'cancelled');

                if (ordersError) throw ordersError;

                const orders = ordersData || [];
                const totalRevenue = orders.reduce((acc, o) => {
                    if (o.total_amount !== undefined && o.total_amount !== null) {
                        return acc + Number(o.total_amount);
                    }
                    const itemsTotal = (o.order_items || []).reduce((sum: number, oi: any) =>
                        sum + (Number(oi.price) * oi.quantity), 0); // Changed from price_at_order
                    return acc + itemsTotal;
                }, 0);

                // 2. Occupied Tables (approximate by active orders)
                const activeTablesCount = new Set(orders.filter(o => o.status !== 'completed' && o.status !== 'archived').map(o => o.table_id)).size;

                // 3. Alacarte average & Profit
                let alacarteRevenue = 0;
                let alacarteOrdersCount = 0;
                let totalEstimatedProfit = 0;

                orders.forEach(o => {
                    const alacarteTotal = (o.order_items || []).filter((oi: any) => !oi.menu_items?.is_rodizio)
                        .reduce((acc: number, oi: any) => acc + (Number(oi.price) * oi.quantity), 0);

                    if (alacarteTotal > 0) {
                        alacarteRevenue += alacarteTotal;
                        alacarteOrdersCount++;
                    }

                    // Profit Calculation
                    const profit = (o.order_items || []).reduce((sum: number, oi: any) => {
                        const margin = oi.menu_items?.is_rodizio ? 0.7 : 0.6;
                        return sum + (Number(oi.price) * oi.quantity * margin);
                    }, 0);
                    totalEstimatedProfit += profit;
                });

                setStats({
                    totalRevenue,
                    totalOrders: orders.length,
                    activeTables: activeTablesCount,
                    alacarteTicket: alacarteOrdersCount > 0 ? alacarteRevenue / alacarteOrdersCount : 0,
                    estimatedProfit: totalEstimatedProfit
                });

                // 4. CHART GENERATION (SPEED)
                const now = new Date();
                const speedBuckets = [];
                for (let i = 60; i >= 0; i--) {
                    const bucketTime = new Date(now.getTime() - (i * 60000));
                    const nextBucketTime = new Date(bucketTime.getTime() + 60000);
                    const timeLabel = bucketTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const minuteOrders = orders.filter(o => {
                        const t = new Date(o.created_at).getTime();
                        return t >= bucketTime.getTime() && t < nextBucketTime.getTime();
                    });

                    let avgMinutes = 0;
                    if (minuteOrders.length > 0) {
                        avgMinutes = minuteOrders.reduce((acc, o) => {
                            const start = new Date(o.created_at).getTime();
                            const end = o.completed_at ? new Date(o.completed_at).getTime() : Date.now();
                            return acc + (end - start) / 60000;
                        }, 0) / minuteOrders.length;
                    }

                    let status: 'good' | 'warning' | 'critical' = 'good';
                    if (avgMinutes > 15) status = 'critical';
                    else if (avgMinutes >= 10) status = 'warning';

                    speedBuckets.push({ time: timeLabel, avgMinutes: Math.floor(avgMinutes), count: minuteOrders.length, status });
                }
                setSpeedData(speedBuckets);

                // 5. HOURLY REVENUE & ABC CURVE
                const hourlyMap = Array.from({ length: 24 }).map((_, hour) => {
                    const revenue = orders.filter(o => new Date(o.created_at).getHours() === hour)
                        .reduce((acc, o) => {
                            const total = o.total_amount || (o.order_items || []).reduce((sum: number, oi: any) => sum + (Number(oi.price) * oi.quantity), 0);
                            return acc + total;
                        }, 0);
                    return { hour: `${hour}h`, revenue };
                }).filter(h => h.revenue > 0 || (h.hour > '10h' && h.hour < '23h'));
                setHourlyRevenue(hourlyMap);






                // 6. TOP ITEMS (QTY)
                const qtyMap = new Map<string, { name: string; quantity: number; total: number }>();
                orders.forEach(o => {
                    (o.order_items || []).forEach((oi: any) => {
                        const name = oi.menu_items?.name;
                        if (!name) return;
                        const existing = qtyMap.get(name);
                        if (existing) {
                            existing.quantity += oi.quantity;
                            existing.total += Number(oi.price) * oi.quantity;
                        } else {
                            qtyMap.set(name, { name, quantity: oi.quantity, total: Number(oi.price) * oi.quantity });
                        }
                    });
                });
                setTopItems(Array.from(qtyMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5));

            } catch (error) {
                console.error("Dashboard error:", error);
            }
        };

        calculateStats();
        const sub = supabase.channel('dashboard_stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => calculateStats())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => calculateStats())
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    const cards = [
        { label: 'Faturamento Total', value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', subLabel: '+12.5% vs anterior', subColor: 'text-emerald-600' },
        { label: 'Lucro Est. (Bruto)', value: `R$ ${stats.estimatedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100/50', border: 'border-emerald-200', subLabel: 'Margem média 65%', subColor: 'text-muted-foreground' },
        { label: 'Pedidos de Hoje', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100/50', border: 'border-blue-200', subLabel: 'Fluxo em tempo real', subColor: 'text-muted-foreground' },
        { label: 'Ticket Médio', value: `R$ ${(stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0).toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100/50', border: 'border-purple-200', subLabel: '-2.1% agora', subColor: 'text-red-500' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                    <p className="text-muted-foreground mt-1 text-lg">Visão geral da operação em tempo real.</p>
                </div>
                <Button
                    onClick={handleSeed}
                    disabled={isSeeding}
                    variant="outline"
                    className="gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
                >
                    {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    {isSeeding ? 'Migrando...' : 'Migrar Dados Locais'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div
                        key={idx}
                        className="p-6 bg-white rounded-[2.5rem] shadow-premium border border-border/40 flex items-center gap-5 hover:shadow-premium-hover hover:-translate-y-1 transition-premium group active:scale-95"
                    >
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${card.bg} border-b-4 border-black/5 shadow-inner group-hover:rotate-3 transition-transform duration-500`}>
                            <card.icon className={`w-8 h-8 ${card.color}`} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-70">{card.label}</p>
                            <h3 className="text-2xl font-black text-foreground tracking-tighter leading-none">{card.value}</h3>
                            <div className={`flex items-center gap-1.5 mt-2 transition-all duration-300 group-hover:gap-2`}>
                                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${card.subColor} bg-black/5 tracking-tight flex items-center gap-1`}>
                                    {idx === 0 && <ArrowUpRight className="w-3 h-3" />}
                                    {idx === 3 && <ArrowDownRight className="w-3 h-3" />}
                                    {card.subLabel}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico de Rapidez de Entrega (Line Chart) */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-border/40 min-h-[400px] flex flex-col relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8 relative z-10 transition-premium group-hover:px-2">
                        <div>
                            <h3 className="text-xl font-black flex items-center gap-3 text-foreground tracking-tight">
                                <div className="p-2.5 bg-secondary rounded-[1.2rem] shadow-inner text-primary">
                                    <Clock className="w-5 h-5" />
                                </div>
                                Prazo de Entrega
                            </h3>
                            <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest ml-14 mt-1">Tempo Real • Última 1h</p>
                        </div>

                        {/* Enhanced Status Badge */}
                        <div className="flex items-center gap-3 text-sm bg-secondary/30 p-2 pr-6 pl-2 rounded-[1.5rem] border border-border/20 shadow-sm backdrop-blur-sm transition-premium hover:shadow-md">
                            {(() => {
                                const lastNonZero = speedData.filter(d => d.avgMinutes > 0).pop();
                                const currentStatus = lastNonZero ? lastNonZero.status : 'good';

                                let label = "Eficiente";
                                let desc = "< 10 min";
                                let color = "text-emerald-700 bg-emerald-50 shadow-emerald-500/10";
                                let icon = CheckCircle;

                                if (currentStatus === 'critical') {
                                    label = "Alerta";
                                    desc = "> 15 min";
                                    color = "text-red-700 bg-red-50 shadow-red-500/10";
                                    icon = AlertTriangle;
                                } else if (currentStatus === 'warning') {
                                    label = "Atenção";
                                    desc = "10-15 min";
                                    color = "text-yellow-700 bg-yellow-50 shadow-yellow-500/10";
                                    icon = AlertTriangle;
                                }

                                const IconComp = icon;

                                return (
                                    <>
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color} shadow-lg transition-transform duration-500 group-hover:scale-110`}>
                                            <IconComp className="w-6 h-6" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em] leading-none opacity-60 mb-1">{label}</span>
                                            <span className="font-black text-foreground text-sm leading-none tracking-tight italic">{desc}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="relative flex-1 w-full min-h-[250px] flex">
                        {/* Y-Axis Labels */}
                        <div className="flex flex-col justify-between text-[10px] text-muted-foreground/40 pr-6 py-4 select-none font-black text-right w-14 tracking-tighter">
                            <span>0m</span>
                            <span>15m</span>
                            <span>30m</span>
                            <span>45m</span>
                            <span>60m+</span>
                        </div>

                        {/* Chart Area */}
                        <div className="relative flex-1 h-full border-l border-b border-border/40 group/chart cursor-crosshair">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-full h-px bg-border/20 border-t border-dashed border-border/40" />
                                ))}
                            </div>

                            {/* SVG Layer */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                                    </linearGradient>
                                    <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="50%" stopColor="#eab308" />
                                        <stop offset="100%" stopColor="#ef4444" />
                                    </linearGradient>
                                </defs>

                                {(() => {
                                    if (speedData.length < 2) return null;

                                    const points = speedData.map((d, i) => {
                                        const x = (i / (speedData.length - 1)) * 100;
                                        const y = 100 - Math.min((d.avgMinutes / 60) * 100, 100);
                                        return { x, y };
                                    });

                                    const lineD = points.reduce((acc, p, i, a) => {
                                        if (i === 0) return `M ${p.x} ${p.y}`;
                                        const prev = a[i - 1];
                                        const cp1x = prev.x + (p.x - prev.x) / 2.5;
                                        const cp1y = prev.y;
                                        const cp2x = p.x - (p.x - prev.x) / 2.5;
                                        const cp2y = p.y;
                                        return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
                                    }, '');

                                    const areaD = `${lineD} L 100 100 L 0 100 Z`;

                                    return (
                                        <>
                                            <path d={areaD} fill="url(#areaGradient)" stroke="none" className="transition-all duration-1000" />
                                            <path
                                                d={lineD}
                                                fill="none"
                                                stroke="url(#lineStrokeGradient)"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                vectorEffect="non-scaling-stroke"
                                                className="drop-shadow-xl opacity-80"
                                            />
                                        </>
                                    );
                                })()}
                            </svg>

                            {/* Point Detail Tooltip */}
                            <div className="absolute inset-0 flex items-end">
                                {speedData.map((item, i) => (
                                    <div
                                        key={i}
                                        className="absolute h-full group/point hover:z-20"
                                        style={{
                                            left: `${(i / (speedData.length - 1)) * 100}%`,
                                            width: `${100 / speedData.length}%`,
                                            transform: 'translateX(-50%)'
                                        }}
                                    >
                                        <div className="absolute w-px bg-primary/20 top-0 bottom-0 left-1/2 opacity-0 group-hover/point:opacity-100 pointer-events-none transition-premium" />
                                        <div
                                            className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black rounded-xl shadow-2xl px-3 py-2 opacity-0 group-hover/point:opacity-100 transition-premium pointer-events-none border border-white/20 z-30"
                                            style={{ bottom: `${100 - Math.min((item.avgMinutes / 60) * 100, 100)}%` }}
                                        >
                                            <div className="italic uppercase tracking-widest opacity-60 mb-0.5">{item.time}</div>
                                            <div className="text-sm font-black text-primary">{item.avgMinutes} min</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-border/40 min-h-[300px] flex flex-col group">
                    <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-foreground tracking-tight">
                        <div className="p-2.5 bg-secondary rounded-[1.2rem] shadow-inner text-primary">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        Pirâmide de Vendas
                    </h3>

                    <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                        {topItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm opacity-40 italic font-medium">
                                <ShoppingBag className="w-12 h-12 mb-3 opacity-10" />
                                Dados indisponíveis no momento.
                            </div>
                        ) : (
                            <div className="space-y-4 px-2 pb-2">
                                {topItems.map((item, index) => (
                                    <div key={index} className="flex items-center gap-5 p-5 bg-secondary/20 rounded-[1.8rem] border border-transparent hover:border-primary/10 hover:bg-white transition-premium hover:shadow-premium group/item active:scale-[0.98]">
                                        <div className={`
                                            flex items-center justify-center w-12 h-12 rounded-[1.2rem] font-black text-xs shadow-lg transition-premium group-hover/item:rotate-12
                                            ${index === 0 ? 'bg-primary text-white shadow-primary/30 ring-4 ring-primary/10' :
                                                index === 1 ? 'bg-slate-800 text-white shadow-slate-800/20' :
                                                    index === 2 ? 'bg-slate-500 text-white shadow-slate-500/20' :
                                                        'bg-white border border-border text-muted-foreground shadow-sm'}
                                        `}>
                                            {index + 1}º
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-sm truncate text-foreground group-hover/item:text-primary transition-colors tracking-tight uppercase italic">{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1 opacity-60">{item.quantity} Saídas</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-sm text-foreground bg-secondary/50 px-4 py-2 rounded-2xl border border-black/5 shadow-inner">
                                                R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BI SECTION: HOURLY REVENUE && ABC CURVE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue by Hour */}
                <Card className="bg-white rounded-[2.5rem] shadow-premium border border-border/40 relative overflow-hidden group hover:shadow-premium-hover transition-premium">
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                    <CardHeader className="px-8 pt-8">
                        <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                            <Clock className="w-5 h-5 text-primary" /> Faturamento por Período
                        </CardTitle>
                        <CardDescription className="font-medium italic opacity-60">Análise de calor de vendas diárias.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] px-8 pb-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyRevenue}>
                                <defs>
                                    <linearGradient id="colorBIRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ed1b2e" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ed1b2e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={"rgba(0,0,0,0.05)"} />
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '800', opacity: 0.4 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '800', opacity: 0.4 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', padding: '16px' }}
                                    itemStyle={{ fontWeight: '900', fontSize: '14px', color: '#000' }}
                                    labelStyle={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '10px', opacity: 0.5, marginBottom: '4px' }}
                                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Volume']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#ed1b2e" strokeWidth={5} fillOpacity={1} fill="url(#colorBIRev)" className="drop-shadow-2xl" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <CustomerTurnoverChart />

            <div className="flex items-center justify-center gap-4 py-4 opacity-30 group">
                <div className="h-px bg-border flex-1 group-hover:bg-primary/20 transition-colors"></div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] group-hover:text-primary transition-colors">Ez Menu Intelligence</div>
                <div className="h-px bg-border flex-1 group-hover:bg-primary/20 transition-colors"></div>
            </div>
        </div>
    );
}
