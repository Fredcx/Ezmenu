import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, CheckCircle2, XCircle, Loader2, User, MessageCircle, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Reservation {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    customer_cpf?: string;
    party_size: number;
    reservation_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes: string;
    created_at: string;
    customer?: {
        full_name: string;
        email: string;
    }
}

export const AdminReservations = () => {
    const { slug } = useParams();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReservations = async () => {
            const { data: est } = await supabase
                .from('establishments')
                .select('id')
                .eq('slug', slug)
                .single();

            if (est) {
                const { data, error } = await supabase
                    .from('reservations')
                    .select('*, customer:profiles(full_name, email)')
                    .eq('establishment_id', est.id)
                    .order('reservation_time', { ascending: true });

                if (error) toast.error("Erro ao carregar reservas.");
                else setReservations(data || []);
            }
            setIsLoading(false);
        };

        fetchReservations();

        const channel = supabase.channel('reservation_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'reservations'
            }, () => fetchReservations())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [slug]);

    const updateStatus = async (id: string, status: 'confirmed' | 'cancelled' | 'completed') => {
        const { error } = await supabase
            .from('reservations')
            .update({ status })
            .eq('id', id);

        if (error) toast.error("Erro ao atualizar reserva.");
        else toast.success(`Reserva ${status === 'confirmed' ? 'confirmada' : status === 'cancelled' ? 'cancelada' : 'concluída'}!`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const pendingCount = reservations.filter(r => r.status === 'pending').length;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-primary" /> Gestão de Reservas
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Gerencie as solicitações de reserva e o mapa de mesas futuro.
                    </p>
                </div>
                {pendingCount > 0 && (
                    <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-bold border border-orange-200 flex items-center gap-2 animate-pulse">
                        <Clock className="w-5 h-5" /> {pendingCount} Pendentes
                    </div>
                )}
            </div>

            <div className="grid gap-6">
                {reservations.length === 0 ? (
                    <div className="bg-card border-2 border-dashed rounded-3xl p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                            <Calendar className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Sem Reservas</h3>
                            <p className="text-muted-foreground">Não há reservas registradas para este restaurante.</p>
                        </div>
                    </div>
                ) : (
                    reservations.map((res) => (
                        <div key={res.id} className={`bg-card border rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all ${res.status === 'pending' ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
                            <div className="flex gap-6 items-center flex-1">
                                <div className="p-4 bg-muted rounded-2xl flex flex-col items-center justify-center min-w-[100px]">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">
                                        {new Date(res.reservation_time).toLocaleDateString([], { weekday: 'short' })}
                                    </span>
                                    <span className="text-2xl font-black text-primary">
                                        {new Date(res.reservation_time).getDate()}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-lg">{res.customer?.full_name || res.customer_name}</h3>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                            res.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                'bg-muted text-muted-foreground'
                                            }`}>
                                            {res.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-1 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> {new Date(res.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-primary" /> {res.party_size} Pessoas</span>
                                        {res.customer_phone && <span className="flex items-center gap-1.5 font-medium"><Phone className="w-4 h-4 text-primary" /> {res.customer_phone}</span>}
                                        {res.customer_cpf && <span className="flex items-center gap-1.5 font-medium"><CreditCard className="w-4 h-4 text-primary" /> {res.customer_cpf}</span>}
                                        {res.notes && <span className="col-span-full flex items-start gap-1.5 mt-2 italic bg-muted/30 p-2 rounded-lg leading-tight"><MessageCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {res.notes}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {res.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => updateStatus(res.id, 'confirmed')}
                                            className="h-12 px-6 bg-green-500 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-green-600 transition-all active:scale-95 shadow-md shadow-green-500/20"
                                        >
                                            Confirmar
                                        </button>
                                        <button
                                            onClick={() => updateStatus(res.id, 'cancelled')}
                                            className="h-12 px-6 border bg-card hover:bg-red-50 hover:text-red-500 rounded-2xl font-bold transition-all"
                                        >
                                            Recusar
                                        </button>
                                    </>
                                )}
                                {res.status === 'confirmed' && (
                                    <button
                                        onClick={() => updateStatus(res.id, 'completed')}
                                        className="h-12 px-6 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all"
                                    >
                                        Finalizar
                                    </button>
                                )}
                                {res.status === 'completed' && (
                                    <div className="flex items-center gap-2 text-green-600 font-bold px-4">
                                        <CheckCircle2 className="w-5 h-5" /> Concluída
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
