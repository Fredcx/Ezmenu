import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Store, Calendar, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

type EstablishmentPerformance = {
    id: string;
    name: string;
    revenue: number;
    ordersCount: number;
    ticketAverage: number;
};

export const SuperAdminReports = () => {
    const [performance, setPerformance] = useState<EstablishmentPerformance[]>([]);
    const [globalMetrics, setGlobalMetrics] = useState({
        revenue: 0,
        orders: 0,
        ticket: 0,
        growth: 12.5 // Placeholder until we have historical data
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                // Fetch Establishments
                const { data: establishments } = await supabase.from('establishments').select('id, name');
                if (!establishments) return;

                // Fetch Completed Orders
                const { data: orders } = await supabase
                    .from('orders')
                    .select('total_amount, establishment_id')
                    .eq('status', 'completed');

                if (!orders) return;

                // Calculate Global Metrics
                const totalRev = orders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
                const totalOrd = orders.length;

                setGlobalMetrics({
                    revenue: totalRev,
                    orders: totalOrd,
                    ticket: totalOrd > 0 ? totalRev / totalOrd : 0,
                    growth: 12.5
                });

                // Calculate Per-Store Performance
                const storeStats = establishments.map(est => {
                    const storeOrders = orders.filter(o => o.establishment_id === est.id);
                    const rev = storeOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
                    const count = storeOrders.length;
                    return {
                        id: est.id,
                        name: est.name,
                        revenue: rev,
                        ordersCount: count,
                        ticketAverage: count > 0 ? rev / count : 0
                    };
                });

                // Sort by Revenue Descending
                setPerformance(storeStats.sort((a, b) => b.revenue - a.revenue));

            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReports();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Embedded View - No Main Title */}

            {/* Global KPIS - keeping them or removing? 
               User wanted "Consolidated". The Dashboard ALREADY has KPIs. 
               The Reports component has DUPLICATE KPIs.
               I should remove the KPIs from Reports component and ONLY keep the Table.
            */}

            {/* Performance by Unit Table */}
            <div className="bg-card border rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Store className="w-5 h-5" /> Performance por Unidade</h3>
                    <button className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-6 rounded-xl text-sm transition-colors">Exportar Dados</button>
                </div>

                {isLoading ? (
                    <div className="p-10 text-center animate-pulse">Calculando métricas...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-border/50">
                                <tr>
                                    <th className="text-left py-4 px-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Estabelecimento</th>
                                    <th className="text-right py-4 px-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Faturamento</th>
                                    <th className="text-right py-4 px-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Pedidos</th>
                                    <th className="text-right py-4 px-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Ticket Médio</th>
                                    <th className="text-right py-4 px-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Crescimento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {performance.map((est) => (
                                    <tr key={est.id} className="group hover:bg-muted/10 transition-colors">
                                        <td className="py-4 px-4 font-bold text-foreground">{est.name}</td>
                                        <td className="py-4 px-4 text-right font-black text-green-600">{est.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="py-4 px-4 text-right font-medium">{est.ordersCount}</td>
                                        <td className="py-4 px-4 text-right font-medium text-muted-foreground">{est.ticketAverage.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="py-4 px-4 text-right font-bold text-green-500 text-xs">+12%</td> {/* Placeholder growth */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
