import { Fish, Utensils, Wine, IceCream, ChefHat, GlassWater, Martini, Armchair, ChevronRight, Loader2, Users, Calendar, X, UserPlus, LogOut, Type } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { BrandingLogo } from './BrandingLogo';
import { toast } from 'sonner';
import { useMenu } from '@/contexts/MenuContext';

import { useOrder } from '@/contexts/OrderContext';

interface LandingScreenProps {
    onSelectOption: (option: 'rodizio' | 'alacarte' | 'drinks' | 'desserts' | 'wines' | 'cocktails') => void;
    hasTable?: boolean;
}

export function LandingScreen({ onSelectOption, hasTable = false }: LandingScreenProps) {
    const { t } = useLanguage();
    const { sentOrders, clearTableSession, occupyTable, isTableOccupiedByMe } = useOrder();
    const [tableStatus, setTableStatus] = useState<'free' | 'occupied' | 'waiting_payment' | 'loading'>('loading');
    const [currentOccupants, setCurrentOccupants] = useState<any[]>([]);

    // Capture table and establishment from URL
    const { slug } = useParams();
    const [tableName, setTableName] = useState(localStorage.getItem('ez_menu_table_name') || '');
    const [isOccupying, setIsOccupying] = useState(false);
    const { establishment } = useMenu();
    const [showQueueModal, setShowQueueModal] = useState(false);
    // Form States
    const [partySize, setPartySize] = useState(2);
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        const success = await occupyTable();
        setIsOccupying(false);
        if (success) {
            setTableStatus('occupied');
        }
    };

    const handleExitTable = () => {
        if (sentOrders.length > 0) {
            toast.error("Não é possível sair com pedidos em andamento.");
            return;
        }

        clearTableSession();
        // Force navigate to clean URL
        window.location.search = '';
    };

    const getOptions = () => {
        const menuSections = establishment?.settings?.menu_sections;

        if (menuSections && Array.isArray(menuSections)) {
            const ICON_MAP: any = { Fish, Utensils, Wine, IceCream, GlassWater, Martini, Type };
            
            return menuSections
                .filter(s => s.isVisible)
                .map(s => ({
                    id: s.id,
                    label: s.label,
                    icon: ICON_MAP[s.icon] || Type,
                    image: s.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
                    color: s.id === 'rodizio' ? 'border-primary' : s.id === 'alacarte' ? 'border-secondary' : 'border-border/30',
                    categoryName: s.categoryName
                }));
        }

        // Fallback to legacy logic if no settings found
        const baseOptions = [
            { id: 'desserts', label: t('desserts'), icon: IceCream, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', color: 'border-pink-500' },
            { id: 'drinks', label: t('drinks'), icon: GlassWater, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80', color: 'border-blue-400' },
            { id: 'wines', label: 'CARTA DE VINHOS', icon: Wine, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80', color: 'border-red-800' },
            { id: 'cocktails', label: 'DRINKS', icon: Martini, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80', color: 'border-orange-500' }
        ];

        if (establishment?.restaurant_type === 'general') {
            return [
                { id: 'alacarte', label: 'CARDÁPIO COMPLETO', icon: Utensils, image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&q=80', color: 'border-secondary' },
                ...baseOptions
            ];
        }

        const rodizioLabel = establishment?.restaurant_type === 'steakhouse' ? 'RODÍZIO DE CARNES' : t('rodizio');
        const rodizioImage = establishment?.restaurant_type === 'steakhouse'
            ? 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80'
            : 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80';

        return [
            { id: 'rodizio', label: rodizioLabel, icon: Fish, image: rodizioImage, color: 'border-primary' },
            { id: 'alacarte', label: t('alacarte'), icon: Utensils, image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&q=80', color: 'border-secondary' },
            ...baseOptions
        ];
    };

    const options = getOptions();

    const handleOptionSelect = (option: any) => {
        onSelectOption(option);
    };

    const [showCategories, setShowCategories] = useState(!hasTable || isTableOccupiedByMe);

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
                    <div className="inline-block mb-3 animate-in fade-in zoom-in duration-1000">
                        <div className="relative flex flex-col items-center">
                            <div className="w-28 h-28 bg-white rounded-[2.5rem] shadow-premium border-4 border-background overflow-hidden flex items-center justify-center p-3 group-hover:scale-105 transition-transform duration-500">
                                <BrandingLogo variant="dark" className="w-full h-full" showText={false} />
                            </div>
                            {hasTable && tableName && (
                                <div className="absolute -bottom-2 flex items-center gap-1 z-20">
                                    <div className="grow-primary bg-primary text-white px-5 py-2 rounded-2xl text-[10px] font-black shadow-lg shadow-primary/20 tracking-[0.2em] uppercase border-2 border-background">
                                        Mesa {tableName}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 mb-8 text-center animate-in slide-in-from-top-4 duration-700">
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-foreground mb-0.5">
                            Olá, {localStorage.getItem('ez_menu_client_name')?.split(' ')[0] || 'Bem-vindo'}
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">
                            HOJE É DIA DE CURTIR!
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-2 opacity-40">
                        <div className="h-[1px] w-8 bg-foreground" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{establishment?.name || 'EZMENU'}</span>
                        <div className="h-[1px] w-8 bg-foreground" />
                    </div>
                    <div className="h-6" /> 

                    {!showCategories ? (
                        <div className="px-4 mb-12 max-w-sm mx-auto animate-in slide-in-from-bottom-8 duration-700 flex flex-col gap-4">
                            {hasTable && tableName && (tableStatus === 'free' || (tableStatus === 'occupied' && !isTableOccupiedByMe)) && (
                                <button
                                    onClick={async () => {
                                        await handleOccupy();
                                        setShowCategories(true);
                                    }}
                                    disabled={isOccupying}
                                    className="w-full relative group overflow-hidden py-6 rounded-[2.5rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/40 hover:shadow-premium-hover transition-premium hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-4 border-b-4 border-black/20"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                                    {isOccupying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Armchair className="w-6 h-6" />}
                                    <span className="text-sm sm:text-lg font-black tracking-tight uppercase">
                                        {tableStatus === 'occupied' ? 'Entrar e Pedir' : 'Ocupar mesa e pedir'}
                                    </span>
                                </button>
                            )}

                            <button
                                onClick={() => setShowCategories(true)}
                                className="w-full relative py-6 rounded-[2.5rem] bg-secondary text-secondary-foreground shadow-xl border border-border/50 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 transition-all"
                            >
                                <span className="text-sm sm:text-lg font-bold tracking-tight uppercase px-4">
                                    Somente visualizar cardápio
                                </span>
                            </button>
                        </div>
                    ) : (
                        <>
                        {hasTable && tableStatus === 'occupied' && isTableOccupiedByMe && (
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
                        </>
                    )}
                </div>

                {showCategories && (
                <div className="px-6 flex-1 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 m-auto max-w-sm sm:max-w-2xl lg:max-w-5xl xl:max-w-7xl mb-20">
                        {options.map((option, idx) => (
                            <button
                                key={option.id}
                                onClick={() => handleOptionSelect(option.id)}
                                className="group relative overflow-hidden rounded-[2.5rem] bg-card shadow-premium border border-border/30 transition-premium hover:shadow-premium-hover hover:-translate-y-1 active:scale-95 aspect-[3/4] w-full outline-none isolation-isolate transform-gpu will-change-transform"
                                style={{
                                    animationDelay: `${idx * 150}ms`,
                                    WebkitMaskImage: '-webkit-radial-gradient(white, black)'
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

                    <div className="py-20 flex flex-col items-center justify-center select-none pb-40 opacity-40">
                        <BrandingLogo variant="dark" className="w-12 h-12" showText={true} />
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
