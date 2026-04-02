import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Users, Clock, CheckCircle2, XCircle, UserPlus, Loader2, Phone, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface QueueItem {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_cpf: string;
    party_size: number;
    status: 'waiting' | 'called' | 'seated' | 'cancelled';
    created_at: string;
}

export const AdminQueue = () => {
    const { slug } = useParams();
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newSize, setNewSize] = useState(2);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchQueue = async () => {
            // Get establishment ID
            const { data: est } = await supabase
                .from('establishments')
                .select('id')
                .eq('slug', slug)
                .single();

            if (est) {
                setEstablishmentId(est.id);
                const { data, error } = await supabase
                    .from('waiting_queue')
                    .select('*')
                    .eq('establishment_id', est.id)
                    .neq('status', 'seated')
                    .neq('status', 'cancelled')
                    .order('created_at', { ascending: true });

                if (error) toast.error("Erro ao carregar fila.");
                else setQueue(data || []);
            }
            setIsLoading(false);
        };

        fetchQueue();

        // Subscribe to changes
        const channel = supabase.channel('queue_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'waiting_queue'
            }, () => fetchQueue())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [slug]);

    const handleAddCustomer = async () => {
        if (!newName || !newPhone) {
            toast.error("Nome e Telefone são obrigatórios.");
            return;
        }
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('waiting_queue').insert({
                establishment_id: establishmentId,
                customer_name: newName,
                customer_phone: newPhone,
                party_size: newSize,
                status: 'waiting'
            });

            if (error) throw error;
            toast.success("Cliente adicionado à fila!");
            setShowAddModal(false);
            setNewName('');
            setNewPhone('');
            setNewSize(2);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao adicionar cliente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStatus = async (id: string, status: 'called' | 'seated' | 'cancelled', customerName?: string) => {
        const { error } = await supabase
            .from('waiting_queue')
            .update({ status })
            .eq('id', id);

        if (error) {
            toast.error("Erro ao atualizar status.");
        } else {
            if (status === 'called') {
                toast.success(`Cliente ${customerName} chamado! Notificação enviada.`);
            } else if (status === 'seated') {
                toast.success(`${customerName} acomodado com sucesso.`);
            } else {
                toast.info(`Fila para ${customerName} cancelada.`);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" /> Fila de Espera
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Gerencie os clientes que aguardam por uma mesa.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-primary/20"
                    >
                        <UserPlus className="w-5 h-5" /> Adicionar na Fila
                    </button>
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold border border-primary/20 flex items-center gap-2">
                        <Users className="w-5 h-5" /> {queue.length} Grupos
                    </div>
                </div>
            </div>

            {/* Add Customer Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors">
                            <XCircle className="w-5 h-5" />
                        </button>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold">Adicionar Cliente</h2>
                            <p className="text-muted-foreground text-sm font-medium">Insira os dados para a fila presencial</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-2">Nome do Cliente</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Ex: João Silva"
                                        className="w-full h-12 bg-muted/50 rounded-xl px-4 outline-none focus:ring-2 focus:ring-primary transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-2">Telefone (WhatsApp)</label>
                                    <input
                                        type="tel"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="w-full h-12 bg-muted/50 rounded-xl px-4 outline-none focus:ring-2 focus:ring-primary transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-2 text-center block">Tamanho do Grupo</label>
                                    <div className="flex items-center justify-center gap-6 bg-muted/30 p-2 rounded-xl border">
                                        <button onClick={() => setNewSize(Math.max(1, newSize - 1))} className="w-10 h-10 rounded-lg bg-card border flex items-center justify-center text-xl font-bold">-</button>
                                        <span className="text-2xl font-black">{newSize}</span>
                                        <button onClick={() => setNewSize(newSize + 1)} className="w-10 h-10 rounded-lg bg-card border flex items-center justify-center text-xl font-bold">+</button>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleAddCustomer}
                                disabled={isSubmitting}
                                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-all"
                            >
                                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {queue.length === 0 ? (
                    <div className="bg-card border-2 border-dashed rounded-3xl p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                            <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Fila Vazia</h3>
                            <p className="text-muted-foreground">Nenhum cliente aguardando no momento.</p>
                        </div>
                    </div>
                ) : (
                    queue.map((item, index) => (
                        <div key={item.id} className={`bg-card border rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all ${item.status === 'called' ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''}`}>
                            <div className="flex gap-6 items-center flex-1">
                                <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center font-black text-xl text-primary">
                                    {index + 1}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        {item.customer_name}
                                        <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full">
                                            {item.party_size} {item.party_size === 1 ? 'pessoa' : 'pessoas'}
                                        </span>
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {item.customer_email && <span className="flex items-center gap-1.5">Email: {item.customer_email}</span>}
                                        {item.customer_phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {item.customer_phone}</span>}
                                        {item.customer_cpf && <span className="flex items-center gap-1.5 border-l pl-4">CPF: {item.customer_cpf}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {item.status === 'waiting' && (
                                    <button
                                        onClick={() => updateStatus(item.id, 'called', item.customer_name)}
                                        className="p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-md active:scale-95 group"
                                        title="Chamar Cliente"
                                    >
                                        <Bell className="w-5 h-5 group-hover:animate-bounce" />
                                    </button>
                                )}
                                {item.status === 'called' && (
                                    <button
                                        onClick={() => updateStatus(item.id, 'seated', item.customer_name)}
                                        className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-md active:scale-95"
                                        title="Acomodar na Mesa"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => updateStatus(item.id, 'cancelled', item.customer_name)}
                                    className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                                    title="Remover"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
