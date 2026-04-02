import { useState, useEffect, useMemo } from "react";
import { Settings, User, Building, ShieldCheck, Mail, Users, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

type UserProfile = {
    id: string;
    email: string; // from auth or profile
    full_name: string;
    role: string;
    establishment_id: string | null;
    establishment_name?: string;
};

export const SuperAdminUsers = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Fetch Profiles
                const { data: profiles, error } = await supabase
                    .from('profiles')
                    .select('*');

                if (error) throw error;
                if (!profiles) return;

                // Fetch Establishments for lookup
                const { data: establishments } = await supabase
                    .from('establishments')
                    .select('id, name');

                const estMap = new Map();
                establishments?.forEach(est => estMap.set(est.id, est.name));

                // Map Profiles
                const formattedUsers = profiles.map(p => ({
                    ...p,
                    establishment_name: p.establishment_id ? estMap.get(p.establishment_id) || 'Desconhecido' : 'N/A'
                }));

                setUsers(formattedUsers);

            } catch (err) {
                console.error("Error fetching users", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) {
            return users;
        }
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            (user.full_name && user.full_name.toLowerCase().includes(lowercasedSearchTerm)) ||
            (user.email && user.email.toLowerCase().includes(lowercasedSearchTerm))
        );
    }, [users, searchTerm]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black flex items-center gap-3">
                    <Users className="w-8 h-8 text-primary" /> Clientes
                </h1>
                <p className="text-muted-foreground mt-2 font-medium italic">Base unificada de todos os usuários e clientes da plataforma.</p>
            </div>

            <div className="relative group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border border-border/40 bg-card/50 shadow-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-card border rounded-[2.5rem] p-8 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-10 text-center animate-pulse">Carregando usuários...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border/50 text-left">
                                    <th className="pb-4 pl-4 font-black text-xs uppercase text-muted-foreground tracking-widest">Usuário</th>
                                    <th className="pb-4 pl-4 font-black text-xs uppercase text-muted-foreground tracking-widest">Email</th>
                                    <th className="pb-4 pl-4 font-black text-xs uppercase text-muted-foreground tracking-widest">Função</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-muted-foreground italic">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="group hover:bg-muted/10 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-full text-primary"><User className="w-4 h-4" /></div>
                                                    <span className="font-bold">{user.full_name || 'Sem Nome'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-sm font-mono text-muted-foreground">
                                                <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {user.email}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {(() => {
                                                    const roleMap: Record<string, { label: string, style: string }> = {
                                                        'super_admin': { label: 'MASTER', style: 'bg-purple-100 text-purple-700 border-purple-200' },
                                                        'admin': { label: 'ESTABELECIMENTO', style: 'bg-blue-100 text-blue-700 border-blue-200' },
                                                        'waiter': { label: 'GARÇOM', style: 'bg-orange-100 text-orange-700 border-orange-200' },
                                                        'customer': { label: 'CLIENTE', style: 'bg-gray-100 text-gray-700 border-gray-200' },
                                                        'kitchen': { label: 'COZINHA', style: 'bg-red-100 text-red-700 border-red-200' },
                                                    };
                                                    const config = roleMap[user.role] || { label: user.role.toUpperCase(), style: 'bg-gray-100 text-gray-700' };

                                                    return (
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.style}`}>
                                                            {config.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
