import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Star, Clock, ChefHat, ArrowRight, Users, Armchair, Calendar, X, Loader2, Martini, Fish, Pizza, Coffee, GlassWater, Music, Guitar, Compass } from 'lucide-react';
import { toast } from 'sonner';
import { BrandingLogo } from './BrandingLogo';

interface Establishment {
    id: string;
    name: string;
    slug: string;
    logo_url: string;
    cover_url: string;
    address: string;
    status: string;
    show_tables: boolean;
    show_queue: boolean;
    is_visible: boolean;
    stats?: {
        total_tables: number;
        occupied_tables: number;
        queue_size: number;
        free_tables?: number;
    };
}

export function DiscoveryScreen() {
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<{ name: string | null; email: string | null } | null>(null);
    const navigate = useNavigate();

    const fetchStatsForEstablishment = async (establishmentId: string) => {
        const stats = { total_tables: 0, occupied_tables: 0, queue_size: 0, free_tables: 0 };

        try {
            const [tablesRes, queueRes] = await Promise.all([
                supabase.from('restaurant_tables').select('status, is_label, top_pos, left_pos').eq('establishment_id', establishmentId),
                supabase.from('waiting_queue').select('*', { count: 'exact', head: true }).eq('establishment_id', establishmentId).eq('status', 'waiting')
            ]);

            if (tablesRes.data) {
                // Filter out labels AND tables without positions (likely orphans/test records)
                const actualTables = tablesRes.data.filter((t: any) => !t.is_label && t.top_pos && t.left_pos);
                stats.total_tables = actualTables.length;
                stats.occupied_tables = actualTables.filter((t: any) => t.status !== 'free').length;
                stats.free_tables = actualTables.filter((t: any) => t.status === 'free').length;
            }
            if (queueRes.count !== null) stats.queue_size = queueRes.count;

            setEstablishments(prev => prev.map(p => p.id === establishmentId ? { ...p, stats } : p));
        } catch (err) {
            console.error(`Error fetching stats for ${establishmentId}:`, err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: ests, error } = await supabase
                    .from('establishments')
                    .select('*')
                    .eq('status', 'active')
                    .eq('is_visible', true);

                if (error) {
                    console.error("Error fetching establishments:", error);
                    toast.error("Erro ao carregar restaurantes.");
                    return;
                }

                if (ests && ests.length > 0) {
                    const establishmentsWithStats = ests.map(e => ({
                        ...e,
                        stats: { total_tables: 0, occupied_tables: 0, queue_size: 0, free_tables: 0 }
                    }));
                    setEstablishments(establishmentsWithStats);
                    setIsLoading(false);

                    // Initial stats fetch
                    ests.forEach(est => fetchStatsForEstablishment(est.id));
                } else {
                    setEstablishments([]);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Unexpected error:", error);
                setIsLoading(false);
            }
        };

        const fetchUserData = async () => {
            const hasAuth = localStorage.getItem('ez_menu_access') === 'granted';
            const storedName = localStorage.getItem('ez_menu_client_name');
            const storedEmail = localStorage.getItem('ez_menu_client_email');

            // 1. Give priority to explicitly logged-in client account
            if (hasAuth && storedEmail) {
                setUserProfile({ name: storedName, email: storedEmail });
                return;
            }

            // 2. Fallback to Supabase auth session (e.g. Admin users browsing)
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUserProfile({
                        name: profile.full_name || session.user.email?.split('@')[0] || 'Admin',
                        email: profile.email || session.user.email || ''
                    });
                } else {
                    setUserProfile({
                        name: session.user.email?.split('@')[0] || 'Admin',
                        email: session.user.email || ''
                    });
                }
            }
        };

        fetchData();
        fetchUserData();
    }, []);

    // Real-time stats subscriptions
    useEffect(() => {
        if (establishments.length === 0) return;

        const tablesChannel = supabase
            .channel('discovery-tables')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, (payload) => {
                const update = payload.new as any || payload.old as any;
                if (update?.establishment_id) {
                    fetchStatsForEstablishment(update.establishment_id);
                }
            })
            .subscribe();

        const queueChannel = supabase
            .channel('discovery-queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'waiting_queue' }, (payload) => {
                const update = payload.new as any || payload.old as any;
                if (update?.establishment_id) {
                    fetchStatsForEstablishment(update.establishment_id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(tablesChannel);
            supabase.removeChannel(queueChannel);
        };
    }, [establishments.length]);

    const filtered = establishments.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#FDFBF7] selection:bg-orange-500/20 pb-20">
            {/* Dark Fixed Header */}
            <header className="fixed top-0 left-0 right-0 h-20 bg-black z-[100] flex items-center justify-between px-8 md:px-16 border-b border-white/5 shadow-2xl">
                <div className="flex items-center group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <BrandingLogo variant="light" layout="horizontal" showText={false} className="scale-150 ml-4" />
                </div>

                <div className="flex items-center gap-3 md:gap-10">
                    {userProfile ? (
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-2xl transition-all border border-white/5 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#ED1B2E] flex items-center justify-center text-white font-bold text-xs shadow-lg">
                                    {userProfile.name?.substring(0, 1).toUpperCase() || 'U'}
                                </div>
                                <div className="hidden md:flex flex-col items-start leading-tight">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                        {userProfile.name?.split(' ')[0]}
                                    </span>
                                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">
                                        Ver Conta
                                    </span>
                                </div>
                            </button>

                            {isProfileOpen && (
                                <>
                                    <div className="fixed inset-0 z-[110]" onClick={() => setIsProfileOpen(false)} />
                                    <div className="absolute right-0 mt-3 w-56 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <div className="p-4 border-b border-white/5">
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Acessado como</p>
                                            <p className="text-xs font-bold text-white truncate">{userProfile.email}</p>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                onClick={async () => {
                                                    localStorage.removeItem('ez_menu_access');
                                                    localStorage.removeItem('ez_menu_access_time');
                                                    localStorage.removeItem('ez_menu_client_name');
                                                    localStorage.removeItem('ez_menu_client_email');
                                                    
                                                    // Await the signOut to guarantee the session clears from local storage
                                                    await supabase.auth.signOut();
                                                    
                                                    setUserProfile(null);
                                                    setIsProfileOpen(false);
                                                    toast.success("Sessão encerrada");
                                                    // Force full refresh to clear all states across the app
                                                    window.location.href = '/';
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-xs font-bold"
                                            >
                                                <X className="w-4 h-4" /> Sair da Conta
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-[#ED1B2E] text-white px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Acessar
                        </button>
                    )}
                </div>
            </header>

            {/* EXPERIENCE HERO - Ingresse Inspired */}
            <div className="pt-20">
                <div className="relative h-[65vh] min-h-[500px] overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cover bg-center animate-in fade-in duration-1000"
                        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1600&q=80)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-black/40 to-black/60" />

                    <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
                        <div className="max-w-4xl space-y-6 animate-in slide-in-from-bottom-12 duration-1000">
                            <h2 className="text-white text-xs md:text-sm font-black uppercase tracking-[0.5em] opacity-80 decoration-primary decoration-4 underline-offset-8">
                                Próxima Experiência
                            </h2>
                            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase italic leading-none drop-shadow-2xl">
                                Sabores que <br /> <span className="not-italic">Surpreendem</span>
                            </h1>
                            <p className="text-white/80 font-bold text-lg max-w-2xl mx-auto drop-shadow-md">
                                Os restaurantes mais exclusivos da sua cidade na palma da sua mão.
                            </p>

                            <div className="relative mt-12 max-w-xl mx-auto">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
                                <input
                                    type="text"
                                    placeholder="Qual a sua vontade hoje?"
                                    className="w-full pl-16 pr-8 py-6 rounded-full border-none bg-white shadow-2xl text-lg font-bold placeholder:text-muted-foreground/50 transition-all focus:ring-4 focus:ring-primary/20 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Experience Grid */}
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-2">
                        <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">
                            Experiências <br /> <span className="text-primary not-italic">Recomendadas</span>
                        </h2>
                        <div className="h-1 w-20 bg-primary rounded-full" />
                    </div>
                    <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-black/5">
                        <button className="px-6 py-2 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest">Todos</button>
                        <button className="px-6 py-2 rounded-xl text-black/40 text-[10px] font-black uppercase tracking-widest hover:bg-black/5 transition-colors">Próximos</button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-[450px] bg-white rounded-[2rem] animate-pulse border border-black/5 shadow-sm" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {filtered.map(est => (
                            <div
                                key={est.id}
                                className="group relative flex flex-col bg-white rounded-[2rem] border border-black/[0.03] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 hover:-translate-y-3 isolation-isolate transform-gpu"
                                style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
                            >
                                <div className="h-[320px] overflow-hidden relative">
                                    <img
                                        src={est.cover_url || "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800"}
                                        alt={est.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                                        <div className="bg-white/10 backdrop-blur-md text-white text-[9px] font-black px-4 py-2 rounded-full border border-white/20 uppercase tracking-[0.2em]">Hoje • Gourmet</div>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-primary">
                                            <Star className="w-3 h-3 fill-primary" /> Sugestão Elite
                                        </div>
                                        <h3 className="text-xl font-black text-black group-hover:text-primary transition-colors tracking-tight uppercase italic">{est.name}</h3>
                                        <div className="flex items-center gap-2 text-[10px] text-black/40 font-bold leading-tight">
                                            <MapPin className="w-3 h-3 shrink-0" /> {est.address || 'Localização Premium'}
                                        </div>
                                    </div>

                                    {/* Real-time Stats */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {est.show_tables && est.stats && (
                                            <div className="bg-muted/30 px-3 py-1.5 rounded-lg border border-black/5 flex items-center gap-2 text-[9px] font-bold text-black/60">
                                                <Armchair className="w-3 h-3" /> {est.stats.free_tables ?? 0} Mesas Livres
                                            </div>
                                        )}
                                        {est.show_queue && est.stats && (
                                            <div className="bg-muted/30 px-3 py-1.5 rounded-lg border border-black/5 flex items-center gap-2 text-[9px] font-bold text-black/60">
                                                <Users className="w-3 h-3" /> Fila: {est.stats.queue_size} pessoas
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-black/5 flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => navigate(`/${est.slug}`)}
                                            className="w-full px-6 py-3 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:border-primary transition-all active:scale-95 shadow-lg shadow-black/5 text-center"
                                        >
                                            Ver Cardápio
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Platform Branding Footer */}
            <footer className="bg-black py-20 px-8">
                <div className="max-w-7xl mx-auto flex flex-col items-center gap-10">
                    <BrandingLogo variant="light" layout="horizontal" showText={false} className="scale-[2.5]" />
                    <div className="flex gap-10 text-white/40 text-[10px] font-black uppercase tracking-widest">
                        <button className="hover:text-white transition-colors">Termos de Uso</button>
                        <button className="hover:text-white transition-colors">Privacidade</button>
                        <button className="hover:text-white transition-colors">Seja um Parceiro</button>
                    </div>
                    <p className="text-white/20 text-[8px] font-bold uppercase tracking-[0.5em] mt-10">
                        © 2026 EZ MENU - Premium Dining Experience Platform
                    </p>
                </div>
            </footer>

        </div>
    );
}
