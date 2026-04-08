import { useState, useEffect } from 'react';
import { Bell, Check, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ServiceOption {
    id: string;
    icon: React.ElementType;
    label: string;
    description: string;
    color: string;
    bgGradient: string;
}

export function ServiceScreen() {
    const [activeRequest, setActiveRequest] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [history, setHistory] = useState<any[]>([]);
    const [askObs, setAskObs] = useState(false);
    const [obsText, setObsText] = useState('');
    const { callService, establishmentId, session, isTableOccupiedByMe } = useOrder();

    const fetchHistory = async () => {
        const tableId = localStorage.getItem('ez_menu_table_name');
        if (!tableId || !establishmentId) return;

        try {
            let query = supabase
                .from('service_requests')
                .select('*')
                .eq('table_id', tableId)
                .eq('establishment_id', establishmentId)
                .neq('status', 'archived');

            if (session?.turnStartTime) {
                query = query.gte('created_at', new Date(session.turnStartTime).toISOString());
            }

            const { data } = await query
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (data) setHistory(data);
        } catch (e) {
            console.error("Erro ao buscar histórico", e);
        }
    };

    useEffect(() => {
        fetchHistory();

        const tableId = localStorage.getItem('ez_menu_table_name');
        if (!tableId || !establishmentId) return;

        const channel = supabase.channel('service_history')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'service_requests',
                filter: `table_id=eq.${tableId}` 
            }, () => fetchHistory())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [establishmentId, session]);

    useEffect(() => {
        const updateCooldown = () => {
            const lastCall = localStorage.getItem('ez_menu_last_service_call');
            if (lastCall) {
                const diffSecs = Math.floor((Date.now() - parseInt(lastCall)) / 1000);
                if (diffSecs < 60) {
                    setCooldown(60 - diffSecs);
                } else {
                    setCooldown(0);
                }
            } else {
                setCooldown(0);
            }
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, []);

    const options: ServiceOption[] = [
        {
            id: 'waiter',
            icon: Bell,
            label: 'Chamar Garçom',
            description: 'Atendimento geral',
            color: 'text-primary',
            bgGradient: 'from-primary/20 to-primary/5'
        }
    ];

    const handleRequest = async (id: string, obs?: string) => {
        if (!isTableOccupiedByMe) {
            toast.error('Por favor, ocupe a mesa na tela de Início antes de chamar o garçom!');
            return;
        }
        if (cooldown > 0) {
            toast.error(`Aguarde ${cooldown}s antes de chamar novamente.`);
            return;
        }

        setActiveRequest(id);
        await callService(id as 'waiter' | 'machine', obs);
        
        setAskObs(false);
        setObsText('');
        localStorage.setItem('ez_menu_last_service_call', Date.now().toString());
        setCooldown(60);

        setTimeout(() => {
            setActiveRequest(null);
        }, 1000);
    };

    return (
        <div className="h-full flex flex-col bg-background/50 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-primary opacity-[0.03] rounded-b-[100px] blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-center p-4 bg-card/80 backdrop-blur-md sticky top-0 z-20 border-b border-border/50">
                <span className="font-bold text-lg tracking-tight">Atendimento</span>
            </div>

            <div className="flex-1 flex flex-col px-4 pt-6 pb-32 gap-6 overflow-y-auto">
                {/* Primary Action */}
                <div className="flex flex-col items-center">
                {options.map((option) => (
                    <div key={option.id} className="w-full max-w-sm flex flex-col gap-3">
                        <button
                            onClick={() => {
                                if (option.id === 'waiter') {
                                    setAskObs(!askObs);
                                } else {
                                    handleRequest(option.id);
                                }
                            }}
                            disabled={activeRequest !== null || cooldown > 0}
                            className={`
                                group relative w-full overflow-hidden py-8 rounded-[2.5rem]
                                transition-all duration-500 flex items-center px-10 gap-6 glass-card
                                ${activeRequest === option.id ? 'scale-95 border-primary/50' : 'md:hover:scale-105 active:scale-95 hover:border-primary/30'}
                                ${(activeRequest && activeRequest !== option.id) || cooldown > 0 ? 'opacity-50 grayscale' : ''}
                            `}
                        >
                            <div className={`
                                w-20 h-20 rounded-2xl bg-gradient-to-br transition-transform duration-500
                                ${option.bgGradient} flex items-center justify-center shadow-lg
                                group-hover:rotate-6
                            `}>
                                <option.icon className={`w-10 h-10 ${option.color}`} />
                            </div>

                            <div className="flex-1 text-left">
                                <span className="block text-xl font-black uppercase tracking-tight text-foreground">{option.label}</span>
                                <span className={`block text-xs font-bold uppercase tracking-widest leading-none mt-1 opacity-80 ${cooldown > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    {activeRequest === option.id ? 'Chamando...' : cooldown > 0 ? `Aguarde ${cooldown}s...` : option.description}
                                </span>
                            </div>

                            {activeRequest === option.id ? (
                                <Check className="w-8 h-8 text-green-500 animate-in zoom-in duration-300" />
                            ) : cooldown > 0 ? (
                                <Clock className="w-6 h-6 text-red-500/50" />
                            ) : (
                                <ChevronRight className={`w-6 h-6 text-muted-foreground transition-all duration-300 ${askObs && option.id === 'waiter' ? 'rotate-90 opacity-100' : 'opacity-30 group-hover:translate-x-1 group-hover:opacity-100'}`} />
                            )}
                        </button>
                        
                        {/* Observation Input Panel */}
                        {askObs && option.id === 'waiter' && cooldown === 0 && (
                            <div className="animate-in slide-in-from-top-4 fade-in duration-300 bg-card border border-border rounded-[2rem] p-5 shadow-sm space-y-3">
                                <p className="text-sm font-bold text-foreground">Alguma observação?</p>
                                <input
                                    type="text"
                                    placeholder="Ex: Senha do Wi-Fi, Limpar a mesa..."
                                    value={obsText}
                                    onChange={(e) => setObsText(e.target.value)}
                                    maxLength={50}
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button
                                    onClick={() => handleRequest(option.id, obsText)}
                                    className="w-full bg-primary text-primary-foreground font-black uppercase tracking-wider text-sm py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
                                >
                                    Confirmar Chamado
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                </div>

                {cooldown > 0 && (
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary/50 rounded-full animate-in slide-in-from-bottom-4 self-center mt-2">
                        <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                        <span className="text-xs font-medium text-muted-foreground">Chamado enviado. Modo de espera ativado.</span>
                    </div>
                )}

                {/* History Section */}
                <div className="mt-8 flex flex-col gap-4 animate-in fade-in duration-500 delay-150">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-2">Histórico</h3>
                    
                    {history.length === 0 ? (
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col items-center justify-center text-center min-h-[160px]">
                            <Clock className="w-10 h-10 text-muted-foreground/30 mb-3" />
                            <span className="text-sm font-medium text-muted-foreground">Nenhuma solicitação anterior</span>
                            <span className="text-xs text-muted-foreground/60 mt-1">Seus chamados aparecerão aqui</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {history.map((req) => (
                                <div key={req.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center justify-between animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${req.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                                            {req.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-foreground">
                                                {req.type === 'machine' ? 'Maquininha' : 'Garçom'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full ${req.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                                            {req.status === 'completed' ? 'Atendido' : 'Aguardando'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
