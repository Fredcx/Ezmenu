import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarRange, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CustomerTurnoverChart() {
    const { data, monthName } = useMemo(() => {
        const orders = JSON.parse(localStorage.getItem('ez_menu_sent_orders') || '[]');

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthStr = format(now, 'MMMM', { locale: ptBR });
        const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);

        // Initialize stats for 7 days (0=Sunday to 6=Saturday)
        const stats = Array.from({ length: 7 }, (_, i) => ({
            dayIndex: i,
            totalTables: new Set<string>(),
            totalOrders: 0,
            occurenceCount: 0
        }));

        // 1. Filter orders for current month
        const monthOrders = orders.filter((o: any) => {
            if (!o.timestamp) return false;
            const d = new Date(o.timestamp);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        // 2. Aggregate data
        monthOrders.forEach((o: any) => {
            const d = new Date(o.timestamp);
            const dayIndex = d.getDay();

            const topicId = o.tableId ? `${d.getDate()}-${o.tableId}` : `unknown-${Math.random()}`;
            stats[dayIndex].totalTables.add(topicId);
            stats[dayIndex].totalOrders += 1;
        });

        // 3. Calculate occurrences of each weekday in the current month SO FAR
        for (let d = 1; d <= now.getDate(); d++) {
            const tempDate = new Date(currentYear, currentMonth, d);
            stats[tempDate.getDay()].occurenceCount++;
        }

        // 4. Transform to final chart data
        const weekMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const orderOfDays = [1, 2, 3, 4, 5, 6, 0]; // Start Monday

        const chartData = orderOfDays.map(dayIdx => {
            const s = stats[dayIdx];
            const divisor = s.occurenceCount || 1;

            return {
                name: weekMap[dayIdx],
                mesas: Math.round(s.totalTables.size / divisor),
                pedidos: Math.round(s.totalOrders / divisor)
            };
        });

        return { data: chartData, monthName: capitalizedMonth };

    }, []);

    return (
        <div className="bg-card p-8 rounded-3xl shadow-xl shadow-black/5 border border-border/60 min-h-[400px] flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-8 relative z-10 w-full">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <CalendarRange className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight">
                            Rotatividade Média
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            Referência: <span className="text-foreground bg-secondary px-2 py-0.5 rounded-md text-xs uppercase tracking-wider font-bold">{monthName}</span>
                        </p>
                    </div>
                </div>

                {/* Legend / Info */}
                <div className="flex gap-6 text-xs font-bold text-muted-foreground bg-secondary/30 p-2 pr-4 pl-4 rounded-xl border border-transparent hover:border-border/40 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-sm ring-2 ring-primary/20" />
                        <span className="text-foreground">Mesas/Clientes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-500 dark:bg-slate-400 shadow-sm ring-2 ring-slate-500/20" />
                        <span className="text-foreground">Pedidos Totais</span>
                    </div>
                </div>
            </div>

            <div className="w-full h-[300px] mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barGap={4} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13, fontWeight: 500 }}
                            dy={12}
                        />
                        <YAxis
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted) / 0.15)', radius: 8 }}
                            contentStyle={{
                                borderRadius: '16px',
                                border: '1px solid hsl(var(--border))',
                                boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)',
                                backgroundColor: 'hsl(var(--popover))',
                                color: 'hsl(var(--popover-foreground))',
                                padding: '12px 16px'
                            }}
                            itemStyle={{ padding: 0 }}
                            labelStyle={{ marginBottom: '8px', fontWeight: 'bold', color: 'hsl(var(--foreground))' }}
                        />

                        <Bar
                            dataKey="mesas"
                            name="Mesas Atendidas"
                            fill="hsl(var(--primary))"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={60}
                            animationDuration={1500}
                        />
                        <Bar
                            dataKey="pedidos"
                            name="Volume Pedidos"
                            fill="#64748b"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={60}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
