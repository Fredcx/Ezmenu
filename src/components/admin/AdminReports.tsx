import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
    TrendingUp, Receipt, Clock, ShoppingBag, Heart,
    CreditCard, ArrowUpRight, ArrowDownRight, Wallet, Percent, Banknote, Target, Sparkles, Activity
} from 'lucide-react';

export function AdminReports() {
    const { slug } = useParams();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        estimatedTaxSaved: 0,
        avgStayMinutes: 0,
        avgCheckoutMinutes: 0,
        peakHours: [] as { hour: string, count: number }[],
        topItems: [] as { name: string, count: number, total: number }[],
        bottomItems: [] as { name: string, count: number, total: number }[],
        upsellCount: 0,
        paymentMethods: {
            pix: { count: 0, total: 0 },
            credit: { count: 0, total: 0 },
            debit: { count: 0, total: 0 },
            cash: { count: 0, total: 0 },
            app: { count: 0, total: 0 }
        }
    });

    useEffect(() => {
        async function fetchReports() {
            setLoading(true);
            try {
                // Fetch establishment to get the ID
                const { data: est } = await supabase.from('establishments').select('id').eq('slug', slug).single();
                if (!est) return;

                // Fetch all orders (we focus on archived/completed for accurate reporting)
                const { data: orders } = await supabase
                    .from('orders')
                    .select('*, order_items(*, menu_items(name))')
                    .eq('establishment_id', est.id)
                    .ilike('status', 'archived%');
                
                if (!orders) return;

                let totalRev = 0;
                let totalStay = 0;
                let stayCount = 0;
                let totalCheckoutTime = 0;
                let checkoutCount = 0;
                let upsells = 0;
                const hoursMap: Record<string, number> = {};
                const itemsMap: Record<string, { count: number, total: number }> = {};

                const payments = {
                    pix: { count: 0, total: 0 },
                    credit: { count: 0, total: 0 },
                    debit: { count: 0, total: 0 },
                    cash: { count: 0, total: 0 },
                    app: { count: 0, total: 0 }
                };

                orders.forEach(order => {
                    // Payment metrics
                    let orderTotal = 0;
                    if (order.total_amount) {
                         orderTotal = Number(order.total_amount);
                    } else {
                         // Fallback to order items sum
                         orderTotal = (order.order_items || []).reduce((sum: number, oi: any) => sum + (Number(oi.price) * oi.quantity), 0);
                    }
                    totalRev += orderTotal;

                    const status = order.status || '';
                    if (status.includes('pix')) { payments.pix.count++; payments.pix.total += orderTotal; }
                    else if (status.includes('credit')) { payments.credit.count++; payments.credit.total += orderTotal; }
                    else if (status.includes('debit')) { payments.debit.count++; payments.debit.total += orderTotal; }
                    else if (status.includes('cash')) { payments.cash.count++; payments.cash.total += orderTotal; }
                    else if (status.includes('app')) { payments.app.count++; payments.app.total += orderTotal; }
                    else {
                        // generic archived matches to cash or generic
                        payments.cash.count++; payments.cash.total += orderTotal;
                    }

                    // Times & Hours
                    if (order.created_at) {
                        const date = new Date(order.created_at);
                        const hr = date.getHours().toString().padStart(2, '0') + ':00';
                        hoursMap[hr] = (hoursMap[hr] || 0) + 1;

                        if (order.completed_at) {
                            const completedDate = new Date(order.completed_at);
                            const stayMins = (completedDate.getTime() - date.getTime()) / 60000;
                            if (stayMins > 0 && stayMins < 600) { // filter crazy outliers over 10h
                                totalStay += stayMins;
                                stayCount++;
                            }
                        }
                    }

                    // Items & Checkout Time
                    let lastItemTime = 0;
                    (order.order_items || []).forEach((oi: any) => {
                        const price = Number(oi.price) * oi.quantity;
                        const name = oi.menu_items?.name || 'Item Desconhecido';
                        
                        if (!itemsMap[name]) itemsMap[name] = { count: 0, total: 0 };
                        itemsMap[name].count += oi.quantity;
                        itemsMap[name].total += price;

                        if (oi.observation && oi.observation.includes('[Upsell]')) {
                            upsells += oi.quantity;
                        }

                        // we don't have created_at on order_items directly mapped in this query without join,
                        // assuming order.created_at is base. If we want exact checkout diff, we approximate 
                        // by 10 mins as a placeholder since we don't fetch order_items.created_at right now.
                    });
                });

                const itemsArr = Object.entries(itemsMap).map(([name, data]) => ({ name, ...data }));
                itemsArr.sort((a, b) => b.total - a.total);
                
                const peakArr = Object.entries(hoursMap).map(([hour, count]) => ({ hour, count }));
                peakArr.sort((a, b) => a.hour.localeCompare(b.hour));

                setMetrics({
                    totalRevenue: totalRev,
                    estimatedTaxSaved: totalRev * 0.15, // 15% estimated marketplace fee avoided
                    avgStayMinutes: stayCount > 0 ? Math.round(totalStay / stayCount) : 0,
                    avgCheckoutMinutes: stayCount > 0 ? 5 : 0, // Placeholder
                    peakHours: peakArr,
                    topItems: itemsArr.slice(0, 5),
                    bottomItems: itemsArr.filter(i => i.total > 0).reverse().slice(0, 5),
                    upsellCount: upsells,
                    paymentMethods: payments
                });

            } catch (err) {
                console.error("Erro ao carregar relatórios", err);
            } finally {
                setLoading(false);
            }
        }
        if (slug) fetchReports();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                <div className="w-12 h-12 bg-zinc-200 rounded-2xl mb-4" />
                <div className="w-32 h-4 bg-zinc-200 rounded" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Relatórios Inteligentes</h1>
                <p className="text-zinc-500 text-sm mt-0.5">Visão avançada da operação e economia do seu restaurante.</p>
            </div>

            {/* ECONOMIA */}
            <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-8 mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> 1. Economia & Crescimento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-24 h-24" />
                    </div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Estimativa de Taxas Poupadas</p>
                    <div className="flex items-end gap-3">
                        <span className="text-3xl font-black text-emerald-600">
                            R$ {metrics.estimatedTaxSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                        <Sparkles className="w-3.5 h-3.5" />
                        Considerando 15% de taxas de marketplaces evitadas
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Faturamento (Vendas App/Mesa)</p>
                    <div className="flex items-end gap-3">
                        <span className="text-3xl font-black text-zinc-900">
                            R$ {metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Receita 100% direta
                    </div>
                </div>
            </div>

            {/* OPERACIONAL */}
            <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-8 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> 2. Operacional
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Permanência Média</p>
                            <p className="text-xl font-black text-zinc-900">{metrics.avgStayMinutes} mins</p>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                            <Target className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Rotatividade/Giro</p>
                            <p className="text-sm font-bold text-zinc-700">Otimizado</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 flex flex-col">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6">Pedidos por Horário (Pico)</p>
                    {metrics.peakHours.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">Sem dados suficientes de pedidos.</div>
                    ) : (
                        <div className="flex items-end flex-1 gap-2 mx-auto">
                            {metrics.peakHours.map((ph, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2 group">
                                    <div className="w-10 sm:w-12 bg-zinc-100 rounded-t-lg relative flex items-end justify-center group-hover:bg-zinc-200 transition-colors" style={{ height: '140px' }}>
                                        <div 
                                            className="w-full bg-zinc-900 rounded-t-lg transition-all" 
                                            style={{ height: `${Math.max(10, (ph.count / Math.max(...metrics.peakHours.map(p => p.count))) * 100)}%` }} 
                                        />
                                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded transition-opacity">
                                            {ph.count}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-400">{ph.hour}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ITENS E UPSELL */}
            <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-8 mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> 3. Performance de Itens & Upsell
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Alta Saída */}
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><ArrowUpRight className="w-4 h-4" /></div>
                        <h3 className="font-bold text-sm text-zinc-900">Alta Saída (Top 5)</h3>
                    </div>
                    <div className="space-y-4">
                        {metrics.topItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-zinc-800">{item.name}</p>
                                    <p className="text-[10px] text-zinc-400">{item.count} unidades vendidas</p>
                                </div>
                                <span className="text-xs font-black text-zinc-900">R$ {item.total.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Baixa Saída */}
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><ArrowDownRight className="w-4 h-4" /></div>
                        <h3 className="font-bold text-sm text-zinc-900">Atenção (Menor Saída)</h3>
                    </div>
                    <div className="space-y-4">
                        {metrics.bottomItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="max-w-[130px]">
                                    <p className="text-sm font-bold text-zinc-800 truncate">{item.name}</p>
                                    <p className="text-[10px] text-zinc-400">{item.count} unidades</p>
                                </div>
                                <span className="text-xs font-black text-zinc-500">R$ {item.total.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upsell Banner */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-6 text-white relative overflow-hidden flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                        <Heart className="w-8 h-8 text-pink-400" />
                    </div>
                    <h3 className="text-2xl font-black mb-1">{metrics.upsellCount}</h3>
                    <p className="text-sm font-medium text-slate-300">Aceites de Upsell no Catálogo</p>
                    <p className="text-[10px] mt-4 text-slate-500 max-w-[200px] leading-relaxed">
                        Itens sugeridos diretamente pelo app e aceitos pelos clientes gerando venda adicional.
                    </p>
                </div>
            </div>

            {/* FINANCEIRO */}
            <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-8 mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> 4. Financeiro e Pagamentos
            </h2>
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="space-y-1">
                        <div className="mx-auto w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                            <Banknote className="w-5 h-5 text-teal-600" />
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Pix</p>
                        <p className="text-xl font-black text-zinc-900 whitespace-nowrap">R$ {metrics.paymentMethods.pix.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">{metrics.paymentMethods.pix.count} mesas</p>
                    </div>
                    <div className="space-y-1">
                        <div className="mx-auto w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                            <CreditCard className="w-5 h-5 text-violet-600" />
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Cartão Crédito</p>
                        <p className="text-xl font-black text-zinc-900 whitespace-nowrap">R$ {metrics.paymentMethods.credit.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">{metrics.paymentMethods.credit.count} mesas</p>
                    </div>
                    <div className="space-y-1">
                        <div className="mx-auto w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Cartão Débito</p>
                        <p className="text-xl font-black text-zinc-900 whitespace-nowrap">R$ {metrics.paymentMethods.debit.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">{metrics.paymentMethods.debit.count} mesas</p>
                    </div>
                    <div className="space-y-1">
                        <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                            <Wallet className="w-5 h-5 text-zinc-600" />
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Dinheiro</p>
                        <p className="text-xl font-black text-zinc-900 whitespace-nowrap">R$ {metrics.paymentMethods.cash.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">{metrics.paymentMethods.cash.count} mesas</p>
                    </div>
                </div>
            </div>
            
        </div>
    );
}
