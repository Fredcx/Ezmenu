import { useState, useEffect, useCallback } from 'react';
import { StaffTables } from './StaffTables';
import { StaffRequests } from './StaffRequests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Armchair, LogOut, User, Bell } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const StaffDashboard = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(!slug);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState(0);

    useEffect(() => {
        const checkContext = async () => {
            if (!slug) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { navigate('/equipe/login'); return; }

                const { data: profile } = await supabase.from('profiles').select('role, establishment_id').eq('id', session.user.id).single();
                if (!profile?.establishment_id) { toast.error("Vínculo não encontrado"); navigate('/equipe/login'); return; }

                const { data: est } = await supabase.from('establishments').select('slug').eq('id', profile.establishment_id).single();
                if (est?.slug) { navigate(`/${est.slug}/equipe`, { replace: true }); }
                else { toast.error("Estabelecimento não encontrado"); navigate('/equipe/login'); }
            } else {
                const { data: est } = await supabase.from('establishments').select('id').eq('slug', slug).single();
                if (est) setEstablishmentId(est.id);
                setIsLoading(false);
            }
        };
        checkContext();
    }, [slug, navigate]);

    const fetchRequestsBadge = useCallback(async () => {
        if (!establishmentId) return;
        const { count } = await supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('establishment_id', establishmentId).eq('status', 'pending');
        setPendingRequests(count || 0);
    }, [establishmentId]);

    useEffect(() => {
        fetchRequestsBadge();
        if (!establishmentId) return;
        const ch = supabase.channel(`staff_dash_${establishmentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `establishment_id=eq.${establishmentId}` }, () => {
                fetchRequestsBadge();
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [establishmentId, fetchRequestsBadge]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/equipe/login');
        toast.success('Sessão encerrada');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
                <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold text-zinc-400 font-mono text-xs tracking-widest uppercase animate-pulse">Carregando</p>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-zinc-50 flex flex-col font-sans">
            {/* Minimalist Top Header */}
            <header className="bg-white border-b border-zinc-200 px-5 flex items-center justify-between sticky top-0 z-50 h-16 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900 border border-zinc-200">
                        <User className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-black text-base text-zinc-900 tracking-tight leading-none mb-0.5">{slug?.replace('-', ' ')}</h1>
                        <p className="text-[9px] font-black text-red-600 uppercase tracking-widest leading-none">Painel do Garçom</p>
                    </div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors active:scale-95"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            {/* Mobile Main Content */}
            <main className="flex-1 p-4 md:max-w-md md:mx-auto md:w-full">
                <Tabs defaultValue="tables" className="flex flex-col h-full">
                    <TabsList className="grid grid-cols-2 w-full h-[52px] p-1.5 rounded-2xl bg-white border border-zinc-200 shadow-sm mb-5">
                        <TabsTrigger value="tables" className="rounded-xl gap-2 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                            <Armchair className="w-4 h-4" /> Mapa
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="relative rounded-xl gap-2 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                            <Bell className="w-4 h-4" /> Chamados
                            {pendingRequests > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[9px] text-white font-bold">{pendingRequests}</span>
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tables" className="m-0 border-none outline-none animate-in fade-in zoom-in-95 duration-300">
                        <StaffTables />
                    </TabsContent>

                    <TabsContent value="requests" className="m-0 border-none outline-none animate-in fade-in zoom-in-95 duration-300">
                         <StaffRequests />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};
