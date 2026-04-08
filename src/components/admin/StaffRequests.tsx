import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Bell, BellRing, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceRequest {
    id: string;
    type: string;
    tableId: string;
    timestamp: number;
    status: string;
    userName?: string;
}

export function StaffRequests() {
    const { slug } = useParams();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const fetchRequests = useCallback(async (estId: string) => {
        const { data } = await supabase
            .from('service_requests')
            .select('*')
            .eq('establishment_id', estId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (data) {
            setRequests(data.map(r => ({
                id: r.id,
                type: r.type,
                tableId: r.table_id,
                timestamp: new Date(r.created_at).getTime(),
                status: r.status,
                userName: r.user_name
            })));
        }
    }, []);

    useEffect(() => {
        if (!slug) return;
        supabase.from('establishments').select('id').eq('slug', slug).single().then(({ data }) => {
            if (data) {
                setEstablishmentId(data.id);
                fetchRequests(data.id);
            }
        });
    }, [slug, fetchRequests]);

    useEffect(() => {
        if (!establishmentId) return;
        const ch = supabase.channel(`staff_reqs_${establishmentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `establishment_id=eq.${establishmentId}` }, 
                () => fetchRequests(establishmentId)
            )
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [establishmentId, fetchRequests]);

    const completeRequest = async (id: string) => {
        try {
            await supabase.from('service_requests').update({ status: 'completed' }).eq('id', id);
            toast.success('Chamado resolvido');
            if (establishmentId) fetchRequests(establishmentId);
        } catch {
            toast.error('Erro ao resolver chamado');
        }
    };

    if (requests.length === 0) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-400">
                <Bell className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold">Nenhum chamado no momento</p>
                <p className="text-sm mt-1">Fique de olho, as mesas aparecerão aqui.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20 pt-2">
            {requests.map(req => {
                const elapsedStr = Math.floor((currentTime - req.timestamp) / 60000);
                const isLate = elapsedStr >= 5;

                return (
                    <div key={req.id} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm relative overflow-hidden flex flex-col">
                        {isLate && <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />}
                        
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-black text-zinc-900 leading-none tracking-tight">Mesa {req.tableId}</h3>
                            <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold font-mono ${isLate ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-600'}`}>
                                <Clock className="w-3.5 h-3.5" />
                                {elapsedStr} min
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-5">
                            <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${req.type === 'machine' ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>
                                {req.type === 'machine' ? <CreditCard className="w-6 h-6" /> : <BellRing className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-zinc-800">
                                    {req.type === 'machine' ? 'Levar Maquininha' : 'Chamar Garçom'}
                                </p>
                                {req.userName && req.userName.startsWith('Obs:') ? (
                                    <p className="text-xs font-bold text-zinc-900 mt-1 bg-yellow-300/40 px-2 py-0.5 rounded inline-block border border-yellow-400/50">
                                        {req.userName}
                                    </p>
                                ) : (
                                    <p className="text-xs font-semibold text-zinc-400 mt-0.5">Vá até a mesa para atender</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => completeRequest(req.id)}
                            className="w-full bg-zinc-900 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
                        >
                            <CheckCircle2 className="w-5 h-5" /> Atendido
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
