import { useState } from 'react';
import { Bell, Utensils, Receipt, Sparkles, Check, Clock, CreditCard, ChevronRight } from 'lucide-react';
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

    const options: ServiceOption[] = [
        {
            id: 'waiter',
            icon: Bell,
            label: 'Chamar Garçom',
            description: 'Atendimento geral',
            color: 'text-primary',
            bgGradient: 'from-primary/20 to-primary/5'
        },
        {
            id: 'machine',
            icon: CreditCard,
            label: 'Maquininha',
            description: 'Pagar com cartão',
            color: 'text-orange-500',
            bgGradient: 'from-orange-500/20 to-orange-500/5'
        }
    ];

    const handleRequest = (id: string) => {
        setActiveRequest(id);

        try {
            const participants = JSON.parse(localStorage.getItem('ez_menu_table_participants') || '[]');
            const myName = participants.find((p: any) => p.isMe)?.name || 'Cliente';
            const tableName = localStorage.getItem('ez_menu_table_name') || 'Mesa';

            const newRequest = {
                id: Date.now().toString(),
                type: id,
                status: 'pending',
                timestamp: Date.now(),
                table_id: tableName,
                customer_name: myName
            };

            // 1. Save to service_requests (Supabase)
            supabase.from('service_requests').insert(newRequest).then(({ error }) => {
                if (error) console.error("Error sending request to Supabase", error);
            });

            // 2. If machine, update table status
            if (id === 'machine') {
                supabase.from('restaurant_tables')
                    .update({ status: 'waiting_payment' })
                    .eq('id', tableName)
                    .then(({ error }) => {
                        if (error) console.error("Error updating table status", error);
                    });
            }

            toast.success("Solicitação enviada!");
        } catch (error) {
            console.error("Erro ao solicitar serviço", error);
            toast.error("Erro ao solicitar serviço.");
        }

        // Visual feedback timer
        setTimeout(() => {
            setActiveRequest(null);
        }, 5000);
    };

    return (
        <div className="h-full flex flex-col bg-background/50 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 rounded-b-[100px] blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="px-6 pt-8 pb-4 relative z-10 text-center">
                <h1 className="text-2xl font-black uppercase tracking-tight text-foreground mb-1">
                    Atendimento
                    <span className="text-primary">.</span>
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Como podemos tornar sua experiência perfeita?</p>
            </div>

            {/* Primary Action - "The Buttons" */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 -mt-10 gap-8">
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => handleRequest(option.id)}
                        disabled={activeRequest !== null}
                        className={`
                            group relative w-full max-w-sm overflow-hidden py-8 rounded-[2.5rem]
                            transition-all duration-500 flex items-center px-10 gap-6 glass-card
                            ${activeRequest === option.id ? 'scale-95 border-primary/50' : 'hover:scale-105 active:scale-95 hover:border-primary/30'}
                            ${activeRequest && activeRequest !== option.id ? 'opacity-40 grayscale' : ''}
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
                            <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1 opacity-60">
                                {activeRequest === option.id ? 'Chamando...' : option.description}
                            </span>
                        </div>

                        {activeRequest === option.id ? (
                            <Check className="w-8 h-8 text-green-500 animate-in zoom-in duration-300" />
                        ) : (
                            <ChevronRight className="w-6 h-6 text-muted-foreground opacity-30 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                        )}
                    </button>
                ))}
            </div>

            {activeRequest === 'waiter' && (
                <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full animate-in slide-in-from-bottom-4">
                    <Clock className="w-4 h-4 text-primary animate-spin-slow" />
                    <span className="text-xs font-medium text-muted-foreground">Tempo estimado: 2 min</span>
                </div>
            )}
        </div>
    );
}
