import { Fish, Utensils, Wine, IceCream, ChefHat, GlassWater, Martini, Armchair, ChevronRight, Loader2, Users, Calendar, X, UserPlus, LogOut, Type, Sparkles, Info } from 'lucide-react';
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

export function LandingScreenV2({ onSelectOption, hasTable = false }: LandingScreenProps) {
    const { t } = useLanguage();
    const { sentOrders, clearTableSession, occupyTable, isTableOccupiedByMe, tableStatus } = useOrder();
    const { slug } = useParams();
    const [tableName, setTableName] = useState(localStorage.getItem('ez_menu_table_name') || '');
    const [isOccupying, setIsOccupying] = useState(false);
    const { establishment } = useMenu();

    const handleOccupy = async () => {
        setIsOccupying(true);
        await occupyTable();
        // tableStatus and isTableOccupiedByMe will dynamically update from OrderContext via Supabase!
        setIsOccupying(false);
    };

    const getOptions = () => {
        const menuSections = establishment?.settings?.menu_sections;
        const ICON_MAP: any = { Fish, Utensils, Wine, IceCream, GlassWater, Martini, Type };
        
        if (menuSections && Array.isArray(menuSections)) {
            return menuSections.filter(s => s.isVisible).map(s => ({
                id: s.id,
                label: s.label,
                icon: ICON_MAP[s.icon] || Type,
                image: s.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
                categoryName: s.categoryName
            }));
        }

        return [
            { id: 'rodizio', label: 'RODÍZIO', icon: Fish, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
            { id: 'alacarte', label: 'À LA CARTE', icon: Utensils, image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&q=80' },
            { id: 'drinks', label: 'BEBIDAS', icon: GlassWater, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80' },
            { id: 'wines', label: 'VINHOS', icon: Wine, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80' },
            { id: 'cocktails', label: 'DRINKS', icon: Martini, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80' },
            { id: 'desserts', label: 'DOCES', icon: IceCream, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80' }
        ];
    };

    const options = getOptions();

    return (
        <div className="h-full overflow-y-auto bg-background text-foreground relative no-scrollbar pb-32">
            {/* Header / Language */}
            {(!localStorage.getItem('ez_menu_client_email') || localStorage.getItem('ez_menu_client_name') === 'Visitante') && (
                <div className="absolute top-6 left-6 z-50">
                    <button 
                        onClick={() => {
                            localStorage.removeItem('ez_menu_access');
                            localStorage.removeItem('ez_menu_client_name');
                            window.location.reload();
                        }} 
                        className="flex items-center gap-2 bg-black/5 dark:bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-foreground border border-black/10 dark:border-white/20 uppercase tracking-widest shadow-sm transition-all hover:scale-105 active:scale-95"
                    >
                        <UserPlus className="w-3.5 h-3.5" /> Conta
                    </button>
                </div>
            )}
            
            <div className="absolute top-6 right-6 z-50">
                <LanguageSelector />
            </div>

            {/* Premium Editorial Hero */}
            <div className="relative pt-10 pb-6 px-8 flex flex-col items-center">
                {/* Floating Logo with Soft Shadow */}
                <div className="relative mb-5 group">
                    <div className="absolute inset-0 bg-primary/10 blur-[40px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />
                    <div className="relative w-32 h-32 bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 overflow-hidden flex items-center justify-center p-4 transition-premium hover:-translate-y-2 active:scale-95">
                        <BrandingLogo variant="dark" className="w-full h-full" showText={false} />
                    </div>
                    {hasTable && tableName && (
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-2 rounded-2xl text-[10px] font-black shadow-lg shadow-primary/25 tracking-[0.2em] uppercase border-4 border-background whitespace-nowrap z-20">
                            MESA {tableName}
                        </div>
                    )}
                </div>

                {/* Editorial Greeting */}
                <div className="text-center w-full max-w-lg mx-auto mb-6 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-3 mb-3 w-full">
                        <div className="h-[1px] w-6 bg-border" />
                        <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">{establishment?.name || 'EZMENU'}</span>
                        <div className="h-[1px] w-6 bg-border" />
                    </div>
                    
                    <div className="flex flex-col items-center justify-center space-y-1 w-full px-2">
                        <span className="text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight block font-sans">
                            OLÁ, {(localStorage.getItem('ez_menu_client_name') || 'Visitante').split(' ')[0]}
                        </span>
                        <h2 className="text-[12px] sm:text-[14px] font-bold text-muted-foreground tracking-[0.2em] uppercase font-sans mt-2">
                            FAÇA SEU PEDIDO
                        </h2>
                    </div>
                </div>

                {/* Main Action */}
                {hasTable && tableName && (
                    <div className="w-full max-w-sm mx-auto mb-5 animate-in slide-in-from-bottom-8 duration-700 flex flex-col items-center">
                        <button
                            onClick={handleOccupy}
                            disabled={isOccupying || tableStatus === 'loading' || (tableStatus === 'occupied' && isTableOccupiedByMe)}
                            className={`w-full relative group overflow-hidden py-4 rounded-[2rem] flex items-center justify-center gap-3 transition-all
                                ${tableStatus === 'occupied' && isTableOccupiedByMe 
                                    ? 'bg-foreground text-background opacity-90' 
                                    : 'bg-primary text-white shadow-[0_15px_30px_rgba(237,27,46,0.3)] hover:-translate-y-1 active:scale-95'}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                            
                            {isOccupying || tableStatus === 'loading' ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (tableStatus === 'occupied' && isTableOccupiedByMe) ? (
                                <Users className="w-5 h-5" />
                            ) : (
                                <Armchair className="w-5 h-5" />
                            )}
                            
                            <span className="text-lg font-black tracking-tight uppercase italic flex items-center gap-2">
                                {tableStatus === 'occupied' 
                                    ? (isTableOccupiedByMe ? 'Mesa Ocupada' : 'Entrar na Mesa') 
                                    : 'Ocupar Mesa'}
                                
                                {tableStatus === 'occupied' && isTableOccupiedByMe && (
                                    <span className="relative flex h-2.5 w-2.5 ml-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                    </span>
                                )}
                            </span>
                            
                            {!(tableStatus === 'occupied' && isTableOccupiedByMe) && (
                                <ChevronRight className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform" />
                            )}
                        </button>
                        
                        {tableStatus === 'free' && !isOccupying && (
                            <div className="flex justify-center mt-2 opacity-60 w-full px-4">
                                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest text-center uppercase leading-relaxed max-w-[260px]">
                                    <Info className="w-3.5 h-3.5 inline-block mr-1.5 align-middle relative -top-[1.5px]" />
                                    Clique em "Ocupar Mesa" para iniciar seus pedidos
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Symmetrical 3-Column Grid */}
            <div className="px-5 max-w-5xl mx-auto">
                <div className="grid grid-cols-3 gap-2">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => onSelectOption(option as any)}
                            className="group relative overflow-hidden rounded-[1.5rem] bg-white border border-black/5 shadow-soft transition-premium hover:shadow-premium-hover active:scale-95 flex flex-col justify-between p-3 aspect-[3/4] w-full isolation-isolate"
                        >
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105 z-0"
                                style={{ backgroundImage: `url(${option.image})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity group-hover:opacity-80 z-0" />
                            
                            <div className="relative z-20 self-start bg-white/10 backdrop-blur-md p-2 rounded-[1rem] border border-white/20 group-hover:bg-primary transition-all shadow-sm flex items-center justify-center">
                                <option.icon className="w-5 h-5 text-white" strokeWidth={2} />
                            </div>

                            <div className="relative z-10 text-left mt-auto w-full pr-1">
                                <span className="block text-[10px] sm:text-[11px] md:text-xs font-black text-white uppercase tracking-tight leading-[1.1] drop-shadow-md break-words whitespace-normal">{option.label}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer Branding */}
                <div className="py-24 flex flex-col items-center justify-center select-none pb-40">
                    <BrandingLogo variant="dark" className="w-[180px] h-[90px]" showText={false} skipCustomization={true} />
                </div>
            </div>
        </div>
    );
}
