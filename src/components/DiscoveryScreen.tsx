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
    show_reservations: boolean;
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
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: ests, error } = await supabase
                    .from('establishments')
                    .select('*')
                    .eq('status', 'active'); // Ensure we only fetch active restaurants

                if (error) {
                    console.error("Error fetching establishments:", error);
                    toast.error("Erro ao carregar restaurantes.");
                    return;
                }

                if (ests && ests.length > 0) {
                    // Initialize with default stats
                    const establishmentsWithStats = ests.map(e => ({
                        ...e,
                        stats: { total_tables: 0, occupied_tables: 0, queue_size: 0 }
                    }));
                    setEstablishments(establishmentsWithStats);
                    setIsLoading(false); // Show content immediately

                    // Fetch stats in background
                    ests.forEach(async (est) => {
                        const stats = { total_tables: 0, occupied_tables: 0, queue_size: 0, free_tables: 0 };

                        // Parallel fetch for speed
                        const [tablesRes, queueRes] = await Promise.all([
                            est.show_tables ? supabase.from('restaurant_tables').select('status', { count: 'exact' }).eq('establishment_id', est.id) : Promise.resolve({ data: [] }),
                            est.show_queue ? supabase.from('waiting_queue').select('*', { count: 'exact', head: true }).eq('establishment_id', est.id).eq('status', 'waiting') : Promise.resolve({ count: 0 })
                        ]);

                        if (tablesRes.data) {
                            stats.total_tables = tablesRes.data.length;
                            stats.occupied_tables = tablesRes.data.filter((t: any) => t.status === 'occupied').length;
                            // Count actual free tables (available)
                            stats.free_tables = tablesRes.data.filter((t: any) => t.status === 'available').length;
                        }
                        if (queueRes.count !== null) stats.queue_size = queueRes.count;

                        setEstablishments(prev => prev.map(p => p.id === est.id ? { ...p, stats } : p));
                    });
                } else {
                    setEstablishments([]);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Unexpected error:", error);
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = establishments.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [showResModal, setShowResModal] = useState(false);
    const [selectedEst, setSelectedEst] = useState<Establishment | null>(null);
    const [resDate, setResDate] = useState('');
    const [resTime, setResTime] = useState('');
    const [resPartySize, setResPartySize] = useState(2);
    const [resNotes, setResNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReservation = async () => {
        setIsSubmitting(true);
        if (!selectedEst?.id) { toast.error("Loja não identificada"); setIsSubmitting(false); return; }
        if (!resDate || !resTime) { toast.error("Selecione data e hora"); setIsSubmitting(false); return; }

        const clientEmail = localStorage.getItem('ez_menu_client_email');
        if (!clientEmail) { toast.error("Identifique-se primeiro no restaurante"); setIsSubmitting(false); return; }

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', clientEmail)
                .single();

            const reservationTime = new Date(`${resDate}T${resTime}`).toISOString();

            const { error } = await supabase.from('reservations').insert({
                establishment_id: selectedEst.id,
                customer_id: profile?.id,
                customer_name: localStorage.getItem('ez_menu_client_name') || 'Cliente',
                customer_email: clientEmail,
                party_size: resPartySize,
                reservation_time: reservationTime,
                notes: resNotes
            });

            if (error) throw error;
            toast.success("Solicitação de reserva enviada! Aguarde confirmação.");
            setShowResModal(false);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao solicitar reserva.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] selection:bg-orange-500/20 pb-20">
            {/* Dark Fixed Header */}
            <header className="fixed top-0 left-0 right-0 h-20 bg-black z-[100] flex items-center justify-between px-8 md:px-16 border-b border-white/5 shadow-2xl">
                <div className="flex items-center group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <BrandingLogo variant="light" layout="horizontal" showText={false} className="scale-150 ml-4" />
                </div>

                <div className="flex items-center gap-3 md:gap-10">
                    <button
                        onClick={() => {
                            const hasAuth = localStorage.getItem('ez_menu_access') === 'granted';
                            if (!hasAuth) {
                                toast.error("Faça login para ver suas reservas");
                                navigate('/login');
                            } else {
                                navigate('/reservations');
                            }
                        }}
                        className="text-white/70 hover:text-white text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors"
                    >
                        Minhas Reservas
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-[#ED1B2E] text-white px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        Acessar
                    </button>
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
                                    <div className="absolute top-6 left-6">
                                        <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-2xl group-hover:rotate-6 transition-transform">
                                            <img src={est.logo_url || "https://api.dicebear.com/7.x/initials/svg?seed=" + est.name} className="w-full h-full object-contain rounded-lg" alt="Logo" />
                                        </div>
                                    </div>
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
                                        <div className="flex items-center gap-2 text-[10px] text-black/40 font-bold">
                                            <MapPin className="w-3 h-3" /> {est.address || 'Localização Premium'}
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
                                        {est.show_reservations ? (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEst(est);
                                                        setShowResModal(true);
                                                    }}
                                                    className="px-6 py-3 rounded-xl bg-white border-2 border-black text-black text-[10px] font-black uppercase tracking-[0.1em] hover:bg-black hover:text-white transition-all active:scale-95"
                                                >
                                                    Fazer Reserva
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/${est.slug}`)}
                                                    className="px-6 py-3 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-[0.1em] hover:bg-primary hover:border-primary transition-all active:scale-95 shadow-lg shadow-black/5"
                                                >
                                                    Ver Cardápio
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => navigate(`/${est.slug}`)}
                                                className="w-full px-6 py-3 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:border-primary transition-all active:scale-95 shadow-lg shadow-black/5 text-center"
                                            >
                                                Ver Cardápio
                                            </button>
                                        )}
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

            {/* Reservation Modal */}
            {showResModal && selectedEst && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl relative animate-in slide-in-from-bottom-10 h-[80vh] sm:h-auto overflow-y-auto no-scrollbar">
                        <button onClick={() => setShowResModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-purple-600" />
                            </div>
                            <h2 className="text-2xl font-bold uppercase tracking-tighter italic">Reservar no {selectedEst.name}</h2>
                            <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-black">Solicitação sujeita a aprovação</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-muted-foreground ml-2">Data da Reserva</label>
                                    <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)} className="w-full h-14 bg-muted/50 rounded-2xl px-6 outline-none focus:ring-2 focus:ring-primary transition-all font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-muted-foreground ml-2">Horário</label>
                                    <input type="time" value={resTime} onChange={(e) => setResTime(e.target.value)} className="w-full h-14 bg-muted/50 rounded-2xl px-6 outline-none focus:ring-2 focus:ring-primary transition-all font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-muted-foreground ml-2 text-center block">Número de Pessoas</label>
                                    <div className="flex items-center justify-center gap-6 bg-muted/30 p-4 rounded-2xl border border-black/5">
                                        <button onClick={() => setResPartySize(Math.max(1, resPartySize - 1))} className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-xl font-bold shadow-sm">-</button>
                                        <span className="text-3xl font-black">{resPartySize}</span>
                                        <button onClick={() => setResPartySize(resPartySize + 1)} className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-xl font-bold shadow-sm">+</button>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleReservation} disabled={isSubmitting} className="w-full h-14 bg-black text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Solicitar Reserva"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
