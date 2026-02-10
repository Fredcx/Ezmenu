import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Upload, Store, Image as ImageIcon, MapPin, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParams } from 'react-router-dom';

export function AdminSettings() {
    const { slug } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [establishment, setEstablishment] = useState<any>(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [isVisible, setIsVisible] = useState(true);
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        const fetchEstablishment = async () => {
            const { data, error } = await supabase
                .from('establishments')
                .select('*')
                .eq('slug', slug)
                .single();

            if (data) {
                setEstablishment(data);
                setName(data.name);
                setAddress(data.address || '');
                setIsVisible(data.is_visible !== false);
                setLogoUrl(data.logo_url || '');
            }
            setIsLoading(false);
        };
        fetchEstablishment();
    }, [slug]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('establishments')
                .update({
                    name,
                    address,
                    is_visible: isVisible,
                    logo_url: logoUrl
                })
                .eq('id', establishment.id);

            if (error) throw error;
            toast.success('Configurações salvas com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar configurações.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Branding do Estabelecimento</h2>
                <p className="text-muted-foreground mt-1 font-medium italic opacity-60">Personalize a identidade do seu restaurante no menu.</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-border/40 space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nome de Exibição</label>
                    <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-12 h-14 rounded-2xl border-border/40 focus:ring-primary/20 font-bold text-lg"
                            placeholder="Nome do Restaurante"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Endereço</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                        <Input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="pl-12 h-14 rounded-2xl border-border/40 focus:ring-primary/20 font-bold"
                            placeholder="Endereço Completo"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Visibilidade no Discovery</label>
                    <button
                        onClick={() => setIsVisible(!isVisible)}
                        className={`w-full h-14 rounded-2xl border border-border/40 flex items-center justify-between px-6 transition-all ${isVisible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {isVisible ? (
                                <Eye className="w-5 h-5 text-emerald-600" />
                            ) : (
                                <EyeOff className="w-5 h-5 text-red-600" />
                            )}
                            <span className={`font-bold ${isVisible ? 'text-emerald-700' : 'text-red-700'}`}>
                                {isVisible ? 'Visível para Clientes' : 'Oculto no Discovery'}
                            </span>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isVisible ? 'bg-emerald-500' : 'bg-red-500'
                            }`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isVisible ? 'left-7' : 'left-1'
                                }`} />
                        </div>
                    </button>
                    <p className="text-[10px] text-muted-foreground italic ml-2">
                        Define se o restaurante aparece na busca pública e aba de descobertas.
                    </p>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Logo do Restaurante (URL)</label>
                    <div className="flex gap-4">
                        <div className="w-32 h-32 rounded-[2rem] bg-secondary/30 border-2 border-dashed border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                            )}
                        </div>
                        <div className="flex-1 space-y-4">
                            <Input
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                className="h-14 rounded-2xl border-border/40 font-medium"
                                placeholder="https://exemplo.com/logo.png"
                            />
                            <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                                Use uma imagem de alta resolução com fundo transparente (PNG) para melhores resultados.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border/10">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-premium"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
