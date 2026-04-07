import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
    Globe, Eye, EyeOff, Save, Loader2, Users, Store, MapPin,
    Image as ImageIcon, DollarSign, Smartphone, Layout,
    GripVertical, Plus, Trash2, Edit2, Type,
    Fish, Utensils, Wine, IceCream, GlassWater, ExternalLink, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useMenu } from '@/contexts/MenuContext';

type ActiveTab = 'presence' | 'appearance';

interface MenuSection {
    id: string;
    label: string;
    icon: string;
    isVisible: boolean;
    categoryId?: string;
    categoryName?: string;
    image?: string;
}

const DEFAULT_SECTIONS: MenuSection[] = [
    { id: 'rodizio', label: 'RODÍZIO', icon: 'Fish', isVisible: true, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80' },
    { id: 'alacarte', label: 'À LA CARTE', icon: 'Utensils', isVisible: true, image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&q=80' },
    { id: 'drinks', label: 'BEBIDAS', icon: 'GlassWater', isVisible: true, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80' },
    { id: 'desserts', label: 'SOBREMESAS', icon: 'IceCream', isVisible: true, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80' },
    { id: 'wines', label: 'CARTA DE VINHOS', icon: 'Wine', isVisible: true, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80' },
];

const ICON_MAP: Record<string, any> = { Fish, Utensils, Wine, IceCream, GlassWater, Type };

export const AdminDiscovery = () => {
    const { slug } = useParams();
    const { categories, alacarteCategories } = useMenu();
    const [activeTab, setActiveTab] = useState<ActiveTab>('presence');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [establishment, setEstablishment] = useState<any>(null);

    // Presence state
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [isVisible, setIsVisible] = useState(true);
    const [toggles, setToggles] = useState({ show_tables: true, show_queue: false });
    const [restaurantType, setRestaurantType] = useState<'sushi' | 'steakhouse' | 'general'>('sushi');
    const [rodizioPriceAdult, setRodizioPriceAdult] = useState(129.99);
    const [rodizioPriceChild, setRodizioPriceChild] = useState(69.99);

    // Appearance state
    const [sections, setSections] = useState<MenuSection[]>([]);
    const [headerImage, setHeaderImage] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const allCategories = [...categories, ...alacarteCategories];

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
                setToggles({ show_tables: data.show_tables, show_queue: data.show_queue });
                setRestaurantType(data.restaurant_type || 'sushi');
                setRodizioPriceAdult(data.rodizio_price_adult || 129.99);
                setRodizioPriceChild(data.rodizio_price_child || 69.99);

                // Appearance
                setHeaderImage(data.settings?.header_image || '');
                const savedSections = data.settings?.menu_sections;
                if (savedSections && Array.isArray(savedSections)) {
                    setSections(savedSections);
                } else {
                    const defaults = [...DEFAULT_SECTIONS];
                    if (data.restaurant_type === 'general') {
                        const r = defaults.find(s => s.id === 'rodizio');
                        if (r) r.isVisible = false;
                    }
                    setSections(defaults);
                }
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [slug]);

    const handleSavePresence = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('establishments')
                .update({ name, address, logo_url: logoUrl, is_visible: isVisible, restaurant_type: restaurantType, rodizio_price_adult: rodizioPriceAdult, rodizio_price_child: rodizioPriceChild, ...toggles })
                .eq('slug', slug);
            if (error) throw error;
            toast.success("Configurações atualizadas!");
        } catch (error) {
            toast.error("Erro ao salvar configurações.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAppearance = async () => {
        setIsSaving(true);
        try {
            let finalImageUrl = headerImage;
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${slug}-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('branding').upload(`logos/${fileName}`, logoFile);
                if (uploadError) throw new Error("Erro ao fazer upload da imagem.");
                const { data } = supabase.storage.from('branding').getPublicUrl(`logos/${fileName}`);
                finalImageUrl = data.publicUrl;
            }

            const { data: updateResult, error } = await supabase
                .from('establishments')
                .update({ settings: { ...establishment?.settings, menu_sections: sections, header_image: finalImageUrl } })
                .eq('slug', slug)
                .select();

            if (error) throw error;
            if (!updateResult || updateResult.length === 0) throw new Error("Acesso bloqueado (0 rows). Verifique RLS.");

            setHeaderImage(finalImageUrl);
            setLogoFile(null);
            toast.success("Aparência do cardápio salva!");
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar aparência.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSectionVisibility = (id: string) => {
        if (id === 'rodizio' && (establishment?.restaurant_type === 'sushi' || establishment?.restaurant_type === 'steakhouse')) {
            toast.error("O Rodízio é obrigatório para este tipo de restaurante.");
            return;
        }
        setSections(prev => prev.map(s => s.id === id ? { ...s, isVisible: !s.isVisible } : s));
    };

    const addCustomSection = () => {
        const id = `custom-${Date.now()}`;
        setSections(prev => [...prev, { id, label: 'NOVA SEÇÃO', icon: 'Type', isVisible: true, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' }]);
    };

    const removeSection = (id: string) => {
        if (!id.startsWith('custom')) { toast.error("Seções padrão só podem ser ocultadas."); return; }
        setSections(prev => prev.filter(s => s.id !== id));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Discovery & Marketing</h1>
                    <p className="text-zinc-500 text-sm mt-0.5">Gerencie a presença e a identidade visual do seu restaurante.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <a
                        href={`/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Ver Cardápio</span>
                    </a>
                    <button
                        onClick={activeTab === 'presence' ? handleSavePresence : handleSaveAppearance}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar
                    </button>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-0 border-b border-zinc-200">
                {([
                    { id: 'presence', label: 'Presença & Config', icon: Globe },
                    { id: 'appearance', label: 'Aparência do Cardápio', icon: Smartphone },
                ] as { id: ActiveTab; label: string; icon: React.ElementType }[]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${activeTab === tab.id
                            ? 'border-zinc-900 text-zinc-900'
                            : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ──────────────── PRESENCE TAB ──────────────── */}
            {activeTab === 'presence' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Branding */}
                    <div className="lg:col-span-7 space-y-5">
                        <section className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-5">
                            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                <Store className="w-4 h-4 text-zinc-400" /> Branding & Localização
                            </h3>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nome do Restaurante</label>
                                <div className="relative">
                                    <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                    <Input value={name} onChange={e => setName(e.target.value)} className="pl-10 h-11 rounded-xl border-zinc-200 font-medium text-sm" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Endereço Completo</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                    <Input value={address} onChange={e => setAddress(e.target.value)} className="pl-10 h-11 rounded-xl border-zinc-200 font-medium text-sm" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tipo de Restaurante</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'sushi', label: 'Sushi' },
                                        { id: 'steakhouse', label: 'Churrascaria' },
                                        { id: 'general', label: 'Geral / À La Carte' }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setRestaurantType(type.id as any)}
                                            className={`p-3 rounded-xl border-2 transition-all text-sm font-semibold ${restaurantType === type.id ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Logo (URL)</label>
                                <div className="flex gap-3">
                                    <div className="w-16 h-16 rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" /> : <ImageIcon className="w-5 h-5 text-zinc-300" />}
                                    </div>
                                    <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="h-11 rounded-xl border-zinc-200 text-sm" placeholder="https://..." />
                                </div>
                            </div>
                        </section>

                        {restaurantType !== 'general' && (
                            <section className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-zinc-400" /> Preços do Rodízio
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-500">Preço Adulto (R$)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                            <Input type="number" step="0.01" value={rodizioPriceAdult} onChange={e => setRodizioPriceAdult(parseFloat(e.target.value))} className="pl-10 h-11 rounded-xl border-zinc-200 text-sm font-bold" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-500">Preço Criança (R$)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                            <Input type="number" step="0.01" value={rodizioPriceChild} onChange={e => setRodizioPriceChild(parseFloat(e.target.value))} className="pl-10 h-11 rounded-xl border-zinc-200 text-sm font-bold" />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right: Visibility */}
                    <div className="lg:col-span-5 space-y-5">
                        <section className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-5">
                            <h3 className="text-sm font-bold text-zinc-900">Configurações de Visibilidade</h3>

                            <button
                                onClick={() => setIsVisible(!isVisible)}
                                className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${isVisible ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'}`}
                            >
                                <div className="flex gap-3 items-center">
                                    <div className={`p-2.5 rounded-xl ${isVisible ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-200 text-zinc-500'}`}>
                                        {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </div>
                                    <div className="text-left">
                                        <h4 className={`font-bold text-sm ${isVisible ? 'text-emerald-800' : 'text-zinc-600'}`}>Exibir no Discovery</h4>
                                        <p className="text-xs text-zinc-400 mt-0.5">Visível no portal de descoberta</p>
                                    </div>
                                </div>
                                <div className={`w-11 h-6 rounded-full relative transition-colors ${isVisible ? 'bg-emerald-500' : 'bg-zinc-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isVisible ? 'left-6' : 'left-1'}`} />
                                </div>
                            </button>

                            <div className="h-px bg-zinc-100" />

                            <div className="space-y-3">
                                {[
                                    { id: 'show_tables', label: 'Estatísticas de Mesas', sub: 'Ocupação em tempo real', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
                                    { id: 'show_queue', label: 'Fila de Espera', sub: 'Entrada remota na fila', bgColor: 'bg-amber-50', textColor: 'text-amber-600' }
                                ].map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                        <div className="flex gap-3 items-center">
                                            <div className={`p-2 ${item.bgColor} rounded-lg ${item.textColor}`}>
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm text-zinc-900">{item.label}</h4>
                                                <p className="text-[11px] text-zinc-400">{item.sub}</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={(toggles as any)[item.id]} onChange={e => setToggles({ ...toggles, [item.id]: e.target.checked })} className="sr-only peer" />
                                            <div className="w-10 h-5 bg-zinc-200 rounded-full peer peer-checked:bg-zinc-900 peer-focus:outline-none after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {/* ──────────────── APPEARANCE TAB ──────────────── */}
            {activeTab === 'appearance' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Editor */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Logo Upload */}
                        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                                <Layout className="w-4 h-4 text-zinc-400" />
                                <h3 className="text-sm font-bold text-zinc-900">Imagem de Capa / Logo</h3>
                            </div>
                            <div className="p-6">
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 hover:border-zinc-400 transition-all group">
                                            <div className="flex flex-col items-center justify-center py-4">
                                                <ImageIcon className="w-7 h-7 text-zinc-300 mb-2 group-hover:text-zinc-500 transition-colors" />
                                                <p className="text-xs text-zinc-400"><span className="font-semibold text-zinc-600">Clique para enviar</span> ou arraste</p>
                                                <p className="text-[10px] text-zinc-300 mt-0.5">JPG, PNG ou WebP</p>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const objectUrl = URL.createObjectURL(file);
                                                    setHeaderImage(objectUrl);
                                                    setLogoFile(file);
                                                }
                                            }} />
                                        </label>
                                    </div>
                                    {headerImage && (
                                        <div className="w-28 h-28 rounded-xl bg-zinc-100 shrink-0 overflow-hidden border border-zinc-200 relative group">
                                            <img src={headerImage} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => { setHeaderImage(''); setLogoFile(null); }}
                                                className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full p-1.5 transition-all"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sections Editor */}
                        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layout className="w-4 h-4 text-zinc-400" />
                                    <h3 className="text-sm font-bold text-zinc-900">Seções do Cardápio</h3>
                                </div>
                                <button
                                    onClick={addCustomSection}
                                    className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Adicionar
                                </button>
                            </div>

                            <div className="p-4 space-y-2.5 max-h-[50vh] overflow-y-auto no-scrollbar">
                                {sections.map(section => {
                                    const Icon = ICON_MAP[section.icon] || Type;
                                    return (
                                        <div key={section.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${section.isVisible ? 'bg-white border-zinc-100 hover:border-zinc-200' : 'bg-zinc-50 border-zinc-100 opacity-50'}`}>
                                            <div className="cursor-move text-zinc-300 shrink-0">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <div className={`p-2 rounded-lg shrink-0 ${section.isVisible ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-200 text-zinc-400'}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={section.label}
                                                        onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, label: e.target.value } : s))}
                                                        className="bg-transparent border-none p-0 font-bold text-xs uppercase tracking-wider focus:ring-0 w-full text-zinc-700"
                                                    />
                                                    <Edit2 className="w-2.5 h-2.5 text-zinc-300 shrink-0" />
                                                </div>
                                                <p className="text-[10px] text-zinc-400">{section.id.startsWith('custom') ? 'Card Custom' : 'Seção Padrão'}</p>
                                                {!['rodizio', 'alacarte'].includes(section.id) && (
                                                    <select
                                                        value={section.categoryName || ''}
                                                        onChange={e => {
                                                            const cat = allCategories.find(c => c.name === e.target.value);
                                                            setSections(prev => prev.map(s => s.id === section.id ? { ...s, categoryName: e.target.value, categoryId: cat?.id || cat?.dbId } : s));
                                                        }}
                                                        className="text-[10px] font-semibold border-none bg-zinc-100 rounded-lg px-2 py-1 focus:ring-0 w-full mt-1.5"
                                                    >
                                                        <option value="">Vincular Categoria (Padrão)</option>
                                                        {allCategories.map(cat => <option key={cat.id || cat.dbId} value={cat.name}>{cat.name}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => toggleSectionVisibility(section.id)}
                                                    className={`p-2 rounded-lg transition-colors ${section.isVisible ? 'text-emerald-500 hover:bg-zinc-100' : 'text-zinc-300 hover:bg-zinc-100'}`}
                                                >
                                                    {section.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </button>
                                                {section.id.startsWith('custom') && (
                                                    <button onClick={() => removeSection(section.id)} className="p-2 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* iPhone Preview — sticky */}
                    <div className="lg:col-span-5 flex justify-center sticky top-6">
                        <div className="relative">
                            <p className="text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">Preview do Cliente</p>
                            <div className="relative w-[280px] h-[560px] bg-zinc-900 rounded-[2.8rem] border-[7px] border-zinc-800 shadow-2xl overflow-hidden ring-4 ring-zinc-900/10">
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-800 rounded-b-2xl z-50" />

                                {/* Screen */}
                                <div className="w-full h-full bg-white overflow-y-auto no-scrollbar flex flex-col">
                                    <div className="pt-10 pb-5 px-5 text-center">
                                        {headerImage
                                            ? <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border border-zinc-100 overflow-hidden mx-auto mb-3 flex items-center justify-center">
                                                <img src={headerImage} className="w-full h-full object-contain" alt="logo" />
                                            </div>
                                            : <div className="w-16 h-16 bg-zinc-100 rounded-[1.2rem] mx-auto mb-3 border border-zinc-200 flex items-center justify-center">
                                                <Fish className="w-6 h-6 text-zinc-300" />
                                            </div>
                                        }
                                        <h3 className="text-base font-black uppercase tracking-tight text-zinc-900">{establishment?.name}</h3>
                                    </div>

                                    <div className="px-4 grid grid-cols-2 gap-3 pb-10">
                                        {sections.filter(s => s.isVisible).map(section => {
                                            const Icon = ICON_MAP[section.icon] || Type;
                                            return (
                                                <div key={section.id} className="relative aspect-[3/4] rounded-[1.5rem] overflow-hidden bg-zinc-100 border border-zinc-200">
                                                    {section.image && <img src={section.image} className="absolute inset-0 w-full h-full object-cover opacity-70" alt="" />}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                    <div className="absolute top-2.5 left-2.5 bg-white/20 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
                                                        <Icon className="w-3 h-3 text-white" />
                                                    </div>
                                                    <div className="absolute bottom-3 left-3 right-3">
                                                        <span className="block text-[9px] font-black text-white uppercase tracking-tight leading-tight">{section.label}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
