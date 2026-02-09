import { Fish, Utensils, Wine, IceCream, ChefHat, GlassWater, Martini, Armchair, ChevronRight, Loader2, Users, Calendar, X, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { BrandingLogo } from './BrandingLogo';
import { toast } from 'sonner';

interface LandingScreenProps {
    onSelectOption: (option: 'rodizio' | 'alacarte' | 'drinks' | 'desserts' | 'wines' | 'cocktails') => void;
    hasTable?: boolean;
}

export function LandingScreen({ onSelectOption, hasTable = false }: LandingScreenProps) {
    const { t } = useLanguage();
    const [tableStatus, setTableStatus] = useState<'free' | 'occupied' | 'waiting_payment' | 'loading'>('loading');
    const [currentOccupants, setCurrentOccupants] = useState<any[]>([]);

    // Capture table and establishment from URL
    const { slug } = useParams();
    const [tableName, setTableName] = useState(localStorage.getItem('ez_menu_table_name') || '');
    const [isOccupying, setIsOccupying] = useState(false);
    const [establishment, setEstablishment] = useState<any>(null);
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [showResModal, setShowResModal] = useState(false);

    // Form States
    const [partySize, setPartySize] = useState(2);
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchEstablishment = async () => {
            const { data } = await supabase
                .from('establishments')
                .select('*')
                .eq('slug', slug)
                .single();
            if (data) {
                setEstablishment(data);
            }
        };
        fetchEstablishment();
    }, [slug]);

    // Reservation Form States
    const [resDate, setResDate] = useState('');
    const [resTime, setResTime] = useState('');
    const [resPartySize, setResPartySize] = useState(2);
    const [resNotes, setResNotes] = useState('');

    const handleReservation = async () => {
        setIsSubmitting(true);
        if (!establishment?.id) { toast.error("Loja não identificada"); setIsSubmitting(false); return; }
        if (!resDate || !resTime) { toast.error("Selecione data e hora"); setIsSubmitting(false); return; }

        const clientEmail = localStorage.getItem('ez_menu_client_email');
        if (!clientEmail) { toast.error("Identifique-se primeiro"); setIsSubmitting(false); return; }

        try {
            // Get profile ID
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', clientEmail)
                .single();

            const reservationTime = new Date(`${resDate}T${resTime}`).toISOString();

            const { error } = await supabase.from('reservations').insert({
                establishment_id: establishment.id,
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

    useEffect(() => {
        if (!hasTable || !tableName) {
            setTableStatus('free');
            return;
        }

        const fetchStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('restaurant_tables')
                    .select('status, occupants')
                    .eq('id', tableName)
                    .single();

                if (error) throw error;
                setTableStatus(data?.status || 'free');
                setCurrentOccupants(data?.occupants || []);
            } catch (e) {
                console.error("Error fetching table status", e);
                setTableStatus('free');
                setCurrentOccupants([]);
            }
        };

        fetchStatus();

        const channel = supabase.channel(`table_status_${tableName}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurant_tables', filter: `id=eq.${tableName}` }, (payload) => {
                setTableStatus(payload.new.status);
                setCurrentOccupants(payload.new.occupants || []);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableName, hasTable]);

    const handleOccupy = async () => {
        if (!tableName) {
            toast.error("Mesa não identificada. Escaneie um QR Code.");
            return;
        }
        setIsOccupying(true);
        try {
            const userEmail = localStorage.getItem('ez_menu_client_email') || '';
            const userName = localStorage.getItem('ez_menu_client_name') || 'Cliente';

            // 1. Fetch latest occupants to avoid race conditions
            const { data: latestTable } = await supabase
                .from('restaurant_tables')
                .select('occupants, status')
                .eq('id', tableName)
                .single();

            const existingOccupants = latestTable?.occupants || [];

            // 2. Check if user already in list
            const alreadyJoined = existingOccupants.some((occ: any) => occ.email === userEmail);

            if (alreadyJoined) {
                toast.success("Você já está registrado nesta mesa!");
                setTableStatus('occupied');
                setCurrentOccupants(existingOccupants);
                return;
            }

            const newOccupant = {
                name: userName,
                email: userEmail,
                type: 'rodizio', // Default for now
                joined_at: new Date().toISOString()
            };

            const updatedOccupants = [...existingOccupants, newOccupant];

            const { error } = await supabase
                .from('restaurant_tables')
                .update({
                    status: 'occupied',
                    last_activity_at: new Date().toISOString(),
                    occupants: updatedOccupants
                })
                .eq('id', tableName);

            if (error) throw error;
            toast.success(existingOccupants.length > 0 ? "Você entrou na mesa!" : "Mesa ocupada com sucesso!");
            setTableStatus('occupied');
            setCurrentOccupants(updatedOccupants);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao ocupar mesa. Tente novamente.");
        } finally {
            setIsOccupying(false);
        }
    };

    const options = [
        { id: 'rodizio', label: t('rodizio'), icon: Fish, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80', color: 'border-primary' },
        { id: 'alacarte', label: t('alacarte'), icon: Utensils, image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&q=80', color: 'border-secondary' },
        { id: 'desserts', label: t('desserts'), icon: IceCream, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', color: 'border-pink-500' },
        { id: 'drinks', label: t('drinks'), icon: GlassWater, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80', color: 'border-blue-400' },
        { id: 'wines', label: 'CARTA DE VINHOS', icon: Wine, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80', color: 'border-red-800' },
        { id: 'cocktails', label: 'DRINKS', icon: Martini, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80', color: 'border-orange-500' }
    ] as const;

    return (
        <div className="h-full overflow-y-auto bg-background text-foreground relative no-scrollbar">
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                }}>
            </div>

            <div className="absolute top-6 right-6 z-50">
                <LanguageSelector />
            </div>

            <div className="relative z-10 min-h-full flex flex-col">
                <div className="pt-12 pb-6 px-6 text-center">
                    <div className="inline-block mb-6 animate-in fade-in zoom-in duration-1000">
                        <div className="relative flex flex-col items-center">
                            <BrandingLogo variant="dark" className="w-32 h-32" showText={false} />
                            {hasTable && tableName && (
                                <div className="absolute -bottom-3 bg-primary text-primary-foreground px-5 py-2 rounded-2xl text-[10px] font-black shadow-lg shadow-primary/30 tracking-[0.2em] uppercase border-2 border-background z-20">
                                    Mesa {tableName}
                                </div>
                            )}
                        </div>
                    </div>

                    <h1 className="text-4xl font-black tracking-tighter text-foreground mb-1 italic uppercase min-h-[40px] flex items-center justify-center">
                        {establishment ? (
                            <span className="animate-in fade-in duration-500">{establishment.name}</span>
                        ) : (
                            <div className="w-48 h-10 bg-muted/20 animate-pulse rounded-lg" />
                        )}
                    </h1>
                    <p className="text-muted-foreground text-[9px] uppercase tracking-[0.4em] font-black opacity-40 mb-10">
                        {establishment?.name ? 'Premium Dining' : ''}
                    </p>

                    {hasTable && tableName && (tableStatus === 'free' || (tableStatus === 'occupied' && !currentOccupants.some(o => o.email === localStorage.getItem('ez_menu_client_email')))) && (
                        <div className="px-4 mb-12 max-w-sm mx-auto animate-in slide-in-from-bottom-8 duration-700">
                            <button
                                onClick={handleOccupy}
                                disabled={isOccupying}
                                className="w-full relative group overflow-hidden py-6 rounded-[2.5rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/40 hover:shadow-premium-hover transition-premium hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-4 border-b-4 border-black/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                                {isOccupying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Armchair className="w-6 h-6" />}
                                <span className="text-xl font-black tracking-tight uppercase">
                                    {tableStatus === 'occupied' ? 'Entrar na Mesa' : 'Ocupar Mesa'}
                                </span>
                                <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform duration-500" />
                            </button>
                        </div>
                    )}

                    {hasTable && tableStatus === 'occupied' && currentOccupants.some(o => o.email === localStorage.getItem('ez_menu_client_email')) && (
                        <div className="px-6 mb-12 text-emerald-600 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/50 py-5 rounded-[2rem] shadow-premium animate-in fade-in duration-500 mx-auto max-w-sm flex items-center justify-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Você está nesta mesa</p>
                        </div>
                    )}

                    {hasTable && tableStatus === 'waiting_payment' && (
                        <div className="px-6 mb-12 text-orange-600 bg-orange-50/80 backdrop-blur-sm border border-orange-200/50 py-5 rounded-[2rem] shadow-premium animate-pulse mx-auto max-w-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Aguardando Maquininha</p>
                            <p className="text-[9px] font-bold opacity-60">O garçom já foi notificado.</p>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-20 flex-1">
                    <div className="grid grid-cols-2 gap-6 m-auto max-w-lg">
                        {options.map((option, idx) => (
                            <button
                                key={option.id}
                                onClick={() => onSelectOption(option.id)}
                                className="group relative overflow-hidden rounded-[2.5rem] bg-card shadow-premium border border-border/30 transition-premium hover:shadow-premium-hover hover:-translate-y-1 active:scale-95 aspect-[3/4] w-full outline-none isolation-isolate transform-gpu will-change-transform"
                                style={{
                                    animationDelay: `${idx * 150}ms`,
                                    WebkitMaskImage: '-webkit-radial-gradient(white, black)' // Fix for Safari/Chrome overflow-hidden bugs
                                }}
                            >
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                                    style={{ backgroundImage: `url(${option.image})` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent transition-opacity group-hover:opacity-80" />
                                <div className={`absolute inset-0 border-4 ${option.color} opacity-0 group-hover:opacity-10 transition-opacity rounded-[2.5rem] duration-500`} />

                                <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/20 group-hover:bg-primary z-20 transition-premium shadow-lg shadow-black/10">
                                    <option.icon className="w-6 h-6 text-white" />
                                </div>

                                <div className="absolute bottom-6 left-5 right-5 z-10 text-left space-y-1">
                                    <span className="block text-xl font-black text-white uppercase tracking-tight leading-none drop-shadow-lg italic">{option.label}</span>
                                    <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                                        <div className="h-[2px] w-4 bg-white rounded-full"></div>
                                        <span className="block text-[8px] font-black text-white uppercase tracking-[0.1em]">Explorar</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="py-8 pb-12 flex flex-col items-center justify-center opacity-30 select-none grayscale cursor-default hover:grayscale-0 hover:opacity-100 transition-all duration-700 mt-auto">
                    <BrandingLogo variant="dark" className="w-12 h-12" showText={true} />
                </div>
            </div>
        </div>
    );
}
