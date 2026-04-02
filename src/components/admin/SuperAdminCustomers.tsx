import { useState, useEffect } from "react";
import { Users, Search, ShoppingBag, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

type CustomerProfile = {
    phone: string;
    name: string;
    totalOrders: number;
    totalSpent: number;
    lastOrder: string;
    establishments: Set<string>;
};

export const SuperAdminCustomers = () => {
    const [customers, setCustomers] = useState<CustomerProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                // Fetch all completed orders to build customer profiles
                const { data: orders, error } = await supabase
                    .from('orders')
                    .select('id, customer_name, customer_phone, total_amount, created_at, establishment_id, status')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const customerMap = new Map<string, CustomerProfile>();

                orders?.forEach(order => {
                    const rawPhone = order.customer_phone;
                    if (!rawPhone) return;

                    const phone = rawPhone.replace(/\D/g, '');
                    if (phone.length < 8) return;

                    const existing = customerMap.get(phone);

                    if (existing) {
                        existing.totalOrders += 1;
                        existing.totalSpent += (order.status === 'completed' ? (order.total_amount || 0) : 0);
                        existing.establishments.add(order.establishment_id);
                        // Update name if valid and likely newer (since we ordered by created_at desc, first one is newest)
                        if (!existing.name && order.customer_name) existing.name = order.customer_name;
                    } else {
                        customerMap.set(phone, {
                            phone,
                            name: order.customer_name || 'Desconhecido',
                            totalOrders: 1,
                            totalSpent: (order.status === 'completed' ? (order.total_amount || 0) : 0),
                            lastOrder: order.created_at,
                            establishments: new Set([order.establishment_id])
                        });
                    }
                });

                setCustomers(Array.from(customerMap.values()));
            } catch (err) {
                console.error("Error fetching customers", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCustomers();
    }, []);

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black flex items-center gap-3">
                    <Users className="w-8 h-8 text-primary" /> Clientes da Rede
                </h1>
                <p className="text-muted-foreground mt-2 font-medium italic">Base consolidada de clientes baseada no histórico de pedidos.</p>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nome ou telefone..."
                    className="border-none shadow-none text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-card border rounded-[2rem] overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="p-10 text-center animate-pulse">Carregando base de dados...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="text-left p-6 font-bold text-muted-foreground uppercase text-xs tracking-wider">Cliente</th>
                                    <th className="text-left p-6 font-bold text-muted-foreground uppercase text-xs tracking-wider">Contato</th>
                                    <th className="text-right p-6 font-bold text-muted-foreground uppercase text-xs tracking-wider">Pedidos</th>
                                    <th className="text-right p-6 font-bold text-muted-foreground uppercase text-xs tracking-wider">LTV (Gasto)</th>
                                    <th className="text-right p-6 font-bold text-muted-foreground uppercase text-xs tracking-wider">Última Compra</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.slice(0, 50).map((customer) => (
                                    <tr key={customer.phone} className="hover:bg-muted/20 transition-colors group">
                                        <td className="p-6">
                                            <div className="font-bold text-lg">{customer.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <ShoppingBag className="w-3 h-3" /> Comprou em {customer.establishments.size} restaurante(s)
                                            </div>
                                        </td>
                                        <td className="p-6 font-mono text-sm text-muted-foreground">
                                            {customer.phone}
                                        </td>
                                        <td className="p-6 text-right font-bold text-lg">
                                            {customer.totalOrders}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="font-black text-green-600 flex items-center justify-end gap-1">
                                                <TrendingUp className="w-4 h-4" />
                                                {customer.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right text-muted-foreground font-medium text-sm">
                                            <div className="flex items-center justify-end gap-2">
                                                {format(new Date(customer.lastOrder), "dd/MM/yy")} <Calendar className="w-3 h-3" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <span className="font-bold">Nenhum cliente encontrado.</span>
                                <span className="text-xs max-w-md">
                                    O CRM é alimentado automaticamente pelos pedidos <b>Concluídos</b> que possuem número de telefone do cliente.
                                    Assim que houver vendas na plataforma, os clientes aparecerão aqui.
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
