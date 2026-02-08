import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Globe, Eye, EyeOff, Save, Loader2, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export const AdminDiscovery = () => {
    const { slug } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        show_tables: true,
        show_queue: false,
        show_reservations: false
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('establishments')
                .select('show_tables, show_queue, show_reservations')
                .eq('slug', slug)
                .single();

            if (error) {
                toast.error("Erro ao carregar configurações.");
            } else if (data) {
                setSettings(data);
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [slug]);

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await supabase
            .from('establishments')
            .update(settings)
            .eq('slug', slug);

        if (error) {
            toast.error("Erro ao salvar configurações.");
        } else {
            toast.success("Configurações atualizadas com sucesso!");
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Globe className="w-8 h-8 text-primary" /> Discovery
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Controle o que os clientes veem no portal de descoberta e na landing page.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Alterações
                </button>
            </div>

            <div className="grid gap-6">
                {/* Tables Visibility */}
                <div className="bg-card border rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Eye className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Visibilidade de Mesas</h3>
                            <p className="text-sm text-muted-foreground">Exibir se o restaurante tem mesas disponíveis em tempo real.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.show_tables}
                            onChange={(e) => setSettings({ ...settings, show_tables: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>

                {/* Queue Visibility */}
                <div className="bg-card border rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                        <div className="p-3 bg-orange-100 rounded-xl">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Fila de Espera</h3>
                            <p className="text-sm text-muted-foreground">Permitir que clientes entrem na fila pelo site e vejam o tempo estimado.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.show_queue}
                            onChange={(e) => setSettings({ ...settings, show_queue: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>

                {/* Reservations Visibility */}
                <div className="bg-card border rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <Calendar className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Sistema de Reservas</h3>
                            <p className="text-sm text-muted-foreground">Habilitar botão para que clientes solicitem reservas de mesa.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.show_reservations}
                            onChange={(e) => setSettings({ ...settings, show_reservations: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>
        </div>
    );
};
