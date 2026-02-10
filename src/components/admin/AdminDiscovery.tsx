import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Globe, Eye, EyeOff, Save, Loader2, Users, Calendar, Store, MapPin, Image as ImageIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export const AdminDiscovery = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [establishment, setEstablishment] = useState<any>(null);

    // Consolidated State
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [isVisible, setIsVisible] = useState(true);
    const [maxCapacity, setMaxCapacity] = useState(10);
    const [reservationStart, setReservationStart] = useState('18:00');
    const [reservationEnd, setReservationEnd] = useState('23:00');
    const [toggles, setToggles] = useState({
        show_tables: true,
        show_queue: false,
        show_reservations: false
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('establishments')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) {
                toast.error("Erro ao carregar configurações.");
            } else if (data) {
                setEstablishment(data);
                setName(data.name || '');
                setAddress(data.address || '');
                setLogoUrl(data.logo_url || '');
                setIsVisible(data.is_visible !== false);
                setMaxCapacity(data.max_reservations_per_slot || 10);
                setReservationStart(data.reservation_start_time || '18:00');
                setReservationEnd(data.reservation_end_time || '23:00');
                setToggles({
                    show_tables: data.show_tables,
                    show_queue: data.show_queue,
                    show_reservations: data.show_reservations
                });
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [slug]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('establishments')
                .update({
                    name,
                    address,
                    logo_url: logoUrl,
                    is_visible: isVisible,
                    max_reservations_per_slot: maxCapacity,
                    reservation_start_time: reservationStart,
                    reservation_end_time: reservationEnd,
                    ...toggles
                })
                .eq('slug', slug);

            if (error) throw error;
            toast.success("Configurações atualizadas com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setIsSaving(false);
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
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3 uppercase italic tracking-tight">
                        <Globe className="w-8 h-8 text-primary" /> Presença & Configurações
                    </h1>
                    <p className="text-muted-foreground mt-2 font-medium italic opacity-60">
                        Gerencie a identidade e visibilidade do seu restaurante no portal.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Alterações
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Branding & Hours */}
                <div className="lg:col-span-7 space-y-8">
                    <section className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-border/40 space-y-6">
                        <h3 className="text-lg font-black uppercase italic tracking-widest text-foreground/80 flex items-center gap-2">
                            <Store className="w-5 h-5 text-primary" /> Branding & Localização
                        </h3>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nome do Restaurante</label>
                            <div className="relative">
                                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-12 h-14 rounded-2xl border-border/40 focus:ring-primary/20 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Endereço Completo</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                                <Input
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="pl-12 h-14 rounded-2xl border-border/40 focus:ring-primary/20 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Logo do Restaurante (URL)</label>
                            <div className="flex gap-4">
                                <div className="w-24 h-24 rounded-[1.5rem] bg-secondary/30 border-2 border-dashed border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-muted-foreground/20" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Input
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        className="h-14 rounded-2xl border-border/40 font-medium text-sm"
                                        placeholder="https://exemplo.com/logo.png"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-border/40 space-y-6">
                        <h3 className="text-lg font-black uppercase italic tracking-widest text-foreground/80 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" /> Configurações de Reserva
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Capacidade p/ Horário</label>
                                <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                                    <Input
                                        type="number"
                                        value={maxCapacity}
                                        onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                                        className="pl-12 h-14 rounded-2xl border-border/40 focus:ring-primary/20 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Incremento</label>
                                <div className="h-14 flex items-center px-6 bg-secondary/20 rounded-2xl border border-border/20 font-black text-xs uppercase italic opacity-60">
                                    30 Minutos (Padrão)
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Início das Reservas</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                                    <Input
                                        type="time"
                                        value={reservationStart}
                                        onChange={(e) => setReservationStart(e.target.value)}
                                        className="pl-12 h-14 rounded-2xl border-border/40 focus:ring-primary/20 font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Fim das Reservas</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                                    <Input
                                        type="time"
                                        value={reservationEnd}
                                        onChange={(e) => setReservationEnd(e.target.value)}
                                        className="pl-12 h-14 rounded-2xl border-border/40 focus:ring-primary/20 font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Visibilities */}
                <div className="lg:col-span-5 space-y-6">
                    <section className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-border/40 space-y-6">
                        <h3 className="text-lg font-black uppercase italic tracking-widest text-foreground/80">Visibilidade</h3>

                        {/* General Visibility */}
                        <div className="space-y-4">
                            <button
                                onClick={() => setIsVisible(!isVisible)}
                                className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${isVisible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
                            >
                                <div className="flex gap-4 items-center">
                                    <div className={`p-3 rounded-2xl ${isVisible ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {isVisible ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                                    </div>
                                    <div className="text-left">
                                        <h4 className={`font-black uppercase italic text-sm ${isVisible ? 'text-emerald-700' : 'text-red-700'}`}>Exibir Restaurante</h4>
                                        <p className="text-[10px] font-bold opacity-60">Visível o portal de descoberta</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors ${isVisible ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isVisible ? 'left-7' : 'left-1'}`} />
                                </div>
                            </button>
                        </div>

                        <div className="h-px bg-border/20 my-6" />

                        {/* Feature Toggles */}
                        <div className="space-y-4">
                            {[
                                { id: 'show_tables', label: 'Estátisticas de Mesas', sub: 'Ocupação em tempo real', icon: Store, bg: 'bg-blue-100', color: 'text-blue-600' },
                                { id: 'show_queue', label: 'Fila de Espera', sub: 'Entrada remota na fila', icon: Users, bg: 'bg-orange-100', color: 'text-orange-600' },
                                { id: 'show_reservations', label: 'Sistema de Reservas', sub: 'Agendamentos online', icon: Calendar, bg: 'bg-purple-100', color: 'text-purple-600' }
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-transparent hover:border-black/5 transition-all">
                                    <div className="flex gap-4 items-center">
                                        <div className={`p-2.5 ${item.bg} rounded-xl ${item.color}`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">{item.label}</h4>
                                            <p className="text-[10px] font-medium text-muted-foreground">{item.sub}</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(toggles as any)[item.id]}
                                            onChange={(e) => setToggles({ ...toggles, [item.id]: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
