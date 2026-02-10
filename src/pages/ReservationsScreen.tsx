import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Loader2, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { toast } from 'sonner';

interface Reservation {
    id: string;
    customer_name: string;
    customer_email: string;
    party_size: number;
    reservation_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes: string;
    establishment: {
        name: string;
        address: string;
        logo_url: string;
    };
}

export function ReservationsScreen() {
    const navigate = useNavigate();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReservations = async () => {
            const email = localStorage.getItem('ez_menu_user_email') || localStorage.getItem('ez_menu_client_email');
            if (!email) {
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('reservations')
                .select(`
                    *,
                    establishment:establishments(name, address, logo_url)
                `)
                .eq('customer_email', email)
                .order('reservation_time', { ascending: false });

            if (error) {
                console.error(error);
                toast.error("Erro ao carregar suas reservas.");
            } else {
                setReservations(data || []);
            }
            setIsLoading(false);
        };

        fetchReservations();
    }, []);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-white/5 text-white/40 border-white/10';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Confirmada';
            case 'pending': return 'Pendente';
            case 'cancelled': return 'Cancelada';
            case 'completed': return 'Concluída';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] pb-10">
            {/* Header */}
            <header className="h-20 bg-black flex items-center px-6 md:px-16 sticky top-0 z-50">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors mr-6"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">Minhas Reservas</h1>
            </header>

            <main className="max-w-4xl mx-auto p-6 space-y-8 mt-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="font-bold text-black/40 uppercase tracking-widest text-xs">Buscando suas experiências...</p>
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                        <div className="w-20 h-20 bg-black/5 rounded-[2rem] flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-black/20" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight uppercase italic">Nenhuma reserva encontrada</h2>
                            <p className="text-black/40 font-medium">Você ainda não solicitou nenhuma reserva em nossa rede.</p>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-black text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                        >
                            Explorar Restaurantes
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {reservations.map((res) => (
                            <div key={res.id} className="bg-white rounded-[2rem] p-6 shadow-premium border border-black/5 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                    <div className="w-16 h-16 bg-muted rounded-2xl flex-shrink-0 relative overflow-hidden group-hover:rotate-6 transition-transform">
                                        <img
                                            src={res.establishment?.logo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${res.establishment?.name}`}
                                            alt="Logo"
                                            className="w-full h-full object-contain p-2"
                                        />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-black tracking-tight uppercase italic">{res.establishment?.name}</h3>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getStatusStyle(res.status)}`}>
                                                {getStatusLabel(res.status)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-black/40 text-xs font-bold">
                                            <MapPin className="w-3 h-3" /> {res.establishment?.address || 'Endreço não informado'}
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-1 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            <span className="font-black text-sm uppercase italic">
                                                {new Date(res.reservation_time).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <Clock className="w-4 h-4 text-primary" />
                                            <span className="font-bold text-sm">
                                                {new Date(res.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-black/5 flex flex-wrap gap-6 items-center">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-black/40" />
                                        <span className="text-xs font-bold text-black/60">{res.party_size} Pessoas</span>
                                    </div>
                                    {res.notes && (
                                        <div className="flex items-center gap-2 italic text-black/40 text-xs">
                                            <Timer className="w-4 h-4" /> {res.notes}
                                        </div>
                                    )}
                                    <div className="ml-auto text-black/20 text-[8px] font-black uppercase tracking-widest">
                                        Ref: {res.id.substring(0, 8)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
