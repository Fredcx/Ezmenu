import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
    Layout, 
    Smartphone, 
    Eye, 
    EyeOff, 
    GripVertical, 
    Plus, 
    Trash2, 
    Save, 
    Loader2,
    Fish, 
    Utensils, 
    Wine, 
    IceCream, 
    GlassWater, 
    Martini,
    Edit2,
    Type,
    Image as ImageIcon,
    ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMenu } from '@/contexts/MenuContext';

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
    { id: 'cocktails', label: 'DRINKS', icon: 'Martini', isVisible: true, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80' },
];

const ICON_MAP: Record<string, any> = {
    Fish, Utensils, Wine, IceCream, GlassWater, Martini, Type
};

export function AdminMenuPreview() {
    const { slug } = useParams();
    const { categories, alacarteCategories } = useMenu();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [establishment, setEstablishment] = useState<any>(null);
    const [sections, setSections] = useState<MenuSection[]>([]);
    const [headerImage, setHeaderImage] = useState<string>('');
    const [logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('establishments')
                .select('*')
                .eq('slug', slug)
                .single();

            if (data) {
                setEstablishment(data);
                setHeaderImage(data.settings?.header_image || '');
                const savedSections = data.settings?.menu_sections;
                if (savedSections && Array.isArray(savedSections)) {
                    setSections(savedSections);
                } else {
                    // Initialize with defaults based on restaurant type
                    const defaults = [...DEFAULT_SECTIONS];
                    if (data.restaurant_type === 'general') {
                        // Hide rodizio by default for general
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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let finalImageUrl = headerImage;

            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${slug}-${Date.now()}.${fileExt}`;
                const filePath = `logos/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('branding')
                    .upload(filePath, logoFile);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    throw new Error("Erro ao fazer upload da imagem.");
                }

                const { data } = supabase.storage
                    .from('branding')
                    .getPublicUrl(filePath);
                
                finalImageUrl = data.publicUrl;
            }

            const { data: updateResult, error } = await supabase
                .from('establishments')
                .update({
                    settings: {
                        ...establishment.settings,
                        menu_sections: sections,
                        header_image: finalImageUrl
                    }
                })
                .eq('slug', slug)
                .select();

            if (error) throw error;
            if (!updateResult || updateResult.length === 0) {
                throw new Error("Erro Crítico: O banco bloqueou a edição (0 rows updated). Verifique as políticas de banco RLS do estabelecimento!");
            }
            
            setHeaderImage(finalImageUrl);
            setLogoFile(null);
            toast.success("Design do cardápio salvo!");
        } catch (e: any) {
            console.error("Save error:", e);
            toast.error(e.message || "Erro ao salvar design.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleVisibility = (id: string) => {
        if (id === 'rodizio' && (establishment?.restaurant_type === 'sushi' || establishment?.restaurant_type === 'steakhouse')) {
            toast.error("O Rodízio é obrigatório para este tipo de restaurante.");
            return;
        }
        setSections(prev => prev.map(s => s.id === id ? { ...s, isVisible: !s.isVisible } : s));
    };

    const updateLabel = (id: string, label: string) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, label } : s));
    };

    const addCustomSection = () => {
        const id = `custom-${Date.now()}`;
        setSections(prev => [...prev, {
            id,
            label: 'NOVA SEÇÃO',
            icon: 'Type',
            isVisible: true,
            image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
        }]);
    };

    const removeSection = (id: string) => {
        if (!id.startsWith('custom')) {
            toast.error("Seções padrão só podem ser ocultadas.");
            return;
        }
        setSections(prev => prev.filter(s => s.id !== id));
    };

    if (isLoading) return <div className="p-8 animate-pulse">Carregando visualização...</div>;

    const allCategories = [...categories, ...alacarteCategories];

    return (
        <div className="max-w-[1400px] mx-auto p-6 space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <Smartphone className="w-9 h-9 text-primary" /> Visualização do Portal
                    </h1>
                    <p className="text-muted-foreground font-medium italic opacity-60">Personalize a primeira impressão do seu cliente.</p>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href={`/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-secondary/50 text-foreground px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-secondary transition-all shadow-sm active:scale-95 border border-border/50"
                    >
                        <ExternalLink className="w-5 h-5" />
                        <span className="hidden sm:inline">Acessar Cardápio</span>
                    </a>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span className="hidden sm:inline">Salvar Alterações</span>
                        <span className="sm:hidden">Salvar</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Editor Column */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-border/40 shadow-premium overflow-hidden">
                        <div className="p-8 border-b border-border/20 flex items-center justify-between bg-secondary/5">
                            <h2 className="font-black uppercase italic tracking-widest text-sm flex items-center gap-2">
                                <Layout className="w-5 h-5 text-primary" /> Logo e Identidade
                            </h2>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logo do Restaurante</label>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/50 hover:border-primary/50 transition-all group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                                <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Clique para enviar</span> ou arraste</p>
                                                <p className="text-xs text-muted-foreground italic">JPG, PNG ou WebP</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const objectUrl = URL.createObjectURL(file);
                                                        setHeaderImage(objectUrl);
                                                        setLogoFile(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                    {headerImage && (
                                        <div className="w-32 h-32 rounded-xl bg-secondary shrink-0 overflow-hidden border border-border shadow-sm group relative">
                                            <img src={headerImage} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHeaderImage('');
                                                    setLogoFile(null);
                                                }}
                                                className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full p-1.5 backdrop-blur-sm transition-all shadow-md"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-b border-border/20 flex items-center justify-between bg-secondary/5">
                            <h2 className="font-black uppercase italic tracking-widest text-sm flex items-center gap-2">
                                <Layout className="w-5 h-5 text-primary" /> Configurar Seções
                            </h2>
                            <button 
                                onClick={addCustomSection}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Adicionar Card
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                            {sections.map((section, idx) => {
                                const Icon = ICON_MAP[section.icon] || Type;
                                return (
                                    <div key={section.id} className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all ${section.isVisible ? 'bg-white border-border/40' : 'bg-secondary/20 border-transparent grayscale opacity-50'}`}>
                                        <div className="cursor-move text-muted-foreground/30">
                                            <GripVertical className="w-5 h-5" />
                                        </div>
                                        
                                        <div className={`p-3 rounded-2xl ${section.isVisible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>

                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text" 
                                                    value={section.label}
                                                    onChange={(e) => updateLabel(section.id, e.target.value)}
                                                    className="bg-transparent border-none p-0 font-black text-sm uppercase tracking-tight focus:ring-0 w-full"
                                                />
                                                <Edit2 className="w-3 h-3 text-muted-foreground/30" />
                                            </div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                                {section.id.startsWith('custom') ? 'Card Customizado' : 'Seção Padrão'}
                                            </p>

                                            {!['rodizio', 'alacarte'].includes(section.id) && (
                                                <select 
                                                    value={section.categoryName || ''}
                                                    onChange={(e) => {
                                                        const cat = allCategories.find(c => c.name === e.target.value);
                                                        setSections(prev => prev.map(s => s.id === section.id ? { ...s, categoryName: e.target.value, categoryId: cat?.id || cat?.dbId } : s));
                                                    }}
                                                    className="text-[10px] font-black uppercase tracking-tight border-none bg-secondary/30 rounded-xl px-4 py-2 focus:ring-0 w-full mt-2"
                                                >
                                                    <option value="">Vincular Categoria (Padrão)</option>
                                                    {allCategories.map(cat => (
                                                        <option key={cat.id || cat.dbId} value={cat.name}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => toggleVisibility(section.id)}
                                                className={`p-3 rounded-xl transition-colors ${section.isVisible ? 'hover:bg-red-50 text-emerald-600' : 'hover:bg-emerald-50 text-muted-foreground'}`}
                                            >
                                                {section.isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                            </button>
                                            {section.id.startsWith('custom') && (
                                                <button 
                                                    onClick={() => removeSection(section.id)}
                                                    className="p-3 rounded-xl hover:bg-red-50 text-red-400"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* iPhone Preview Column */}
                <div className="lg:col-span-5 flex justify-center sticky top-6">
                    <div className="relative w-[320px] h-[640px] bg-zinc-900 rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden ring-4 ring-zinc-900/10">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-800 rounded-b-2xl z-50"></div>
                        
                        {/* Internal Screen Content */}
                        <div className="w-full h-full bg-white overflow-y-auto no-scrollbar flex flex-col">
                            {/* Header Logo Area */}
                            <div className="pt-12 pb-6 px-6 text-center relative z-10">
                                <div className="inline-block mb-4">
                                    <div className="relative flex flex-col items-center">
                                        {headerImage ? (
                                            <div className="w-24 h-24 bg-white rounded-2xl shadow-xl border-2 border-primary/10 overflow-hidden flex items-center justify-center">
                                                <img src={headerImage} className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 bg-primary/5 rounded-[1.5rem] mx-auto border-2 border-primary/20 flex items-center justify-center">
                                                <Fish className="w-8 h-8 text-primary opacity-40" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">{establishment?.name}</h3>
                            </div>

                            {/* Dynamic Cards Grid */}
                            <div className="px-5 grid grid-cols-2 gap-4 pb-12">
                                {sections.filter(s => s.isVisible).map((section) => {
                                    const Icon = ICON_MAP[section.icon] || Type;
                                    return (
                                        <div 
                                            key={section.id} 
                                            className="relative aspect-[3/4] rounded-[1.8rem] overflow-hidden bg-slate-100 border border-black/5"
                                        >
                                            <img src={section.image} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                            
                                            <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/20">
                                                <Icon className="w-4 h-4 text-white" />
                                            </div>

                                            <div className="absolute bottom-4 left-4 right-4 text-left">
                                                <span className="block text-[11px] font-black text-white uppercase italic tracking-tighter leading-tight drop-shadow-md">
                                                    {section.label || 'Sem Nome'}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-60 mt-0.5">
                                                    <div className="h-[1px] w-2 bg-white"></div>
                                                    <span className="text-[5px] font-black text-white uppercase">Explorar</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Branding */}
                            <div className="mt-auto py-10 flex flex-col items-center opacity-30 select-none">
                                {headerImage ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <img src={headerImage} className="w-8 h-8 grayscale object-contain" />
                                        <div className="text-[6px] font-black uppercase tracking-widest">{establishment?.name}</div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-8 h-8 bg-black rounded-lg mb-2"></div>
                                        <div className="text-[6px] font-black uppercase">Ez Menu</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
