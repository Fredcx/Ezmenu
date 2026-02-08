import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Users, Store, TrendingUp, Package, AlertCircle, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuperAdminEstablishments } from "./SuperAdminEstablishments";
import { SuperAdminCustomers } from "./SuperAdminCustomers";
import { SuperAdminUsers } from "./SuperAdminUsers";
import { SuperAdminReports } from "./SuperAdminReports";

export const SuperAdminDashboard = () => {
    const [stats, setStats] = useState({
        totalEst: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeUsers: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGlobalStats = async () => {
            try {
                // 1. Establishments Count
                const { count: estCount } = await supabase.from('establishments').select('*', { count: 'exact', head: true });

                // 2. Orders Count & Revenue
                const { data: orders } = await supabase
                    .from('orders')
                    .select('total_amount')
                    .eq('status', 'completed'); // Only paid/completed orders count for revenue

                const revenue = orders?.reduce((acc, order) => acc + (order.total_amount || 0), 0) || 0;
                const paidOrdersCount = orders?.length || 0;

                // 3. Total Orders (All statuses)
                const { count: allOrdersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });

                // 4. Total Profiles (Users)
                const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

                setStats({
                    totalEst: estCount || 0,
                    totalOrders: allOrdersCount || 0,
                    totalRevenue: revenue,
                    activeUsers: profilesCount || 0
                });
            } catch (error) {
                console.error("Error fetching global stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchGlobalStats();
    }, []);

    const cards = [
        { label: 'Faturamento Total', value: stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Pedidos Totais', value: stats.totalOrders, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Parceiros Ativos', value: stats.totalEst, icon: Store, color: 'text-orange-600', bg: 'bg-orange-100' },
        { label: 'Usuários do Sistema', value: stats.activeUsers, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-100' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black flex items-center gap-3">
                    <LayoutDashboard className="w-8 h-8 text-primary" /> Visão Geral da Plataforma
                </h1>
                <p className="text-muted-foreground mt-2 font-medium">Controle global unificado do Ez Menu.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-card border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 ${card.bg} rounded-2xl`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{card.label}</p>
                                <p className="text-2xl font-black">{card.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reports Table Integrated */}
            <SuperAdminReports />
        </div>
    );
};
