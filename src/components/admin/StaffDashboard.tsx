
import { useState, useEffect } from 'react';
import { StaffTables } from './StaffTables';
import { AdminKitchen } from './AdminKitchen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Armchair, ChefHat, LogOut, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const StaffDashboard = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(!slug);

    useEffect(() => {
        const checkContext = async () => {
            if (!slug) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    navigate('/equipe/login');
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, establishment_id')
                    .eq('id', session.user.id)
                    .single();

                if (!profile?.establishment_id) {
                    toast.error("Vínculo administrativo não encontrado");
                    navigate('/equipe/login');
                    return;
                }

                const { data: est } = await supabase
                    .from('establishments')
                    .select('slug')
                    .eq('id', profile.establishment_id)
                    .single();

                if (est?.slug) {
                    navigate(`/${est.slug}/equipe`, { replace: true });
                } else {
                    toast.error("Estabelecimento não encontrado");
                    navigate('/equipe/login');
                }
            } else {
                setIsLoading(false);
            }
        };

        checkContext();
    }, [slug, navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/equipe/login');
        toast.success('Sessão encerrada');
    };

    if (isLoading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4 bg-secondary/10">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-muted-foreground animate-pulse">Carregando portal...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary/10 flex flex-col">
            {/* Header / Top Bar */}
            <header className="bg-white border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-black text-sm uppercase tracking-tight leading-none">{slug?.replace('-', ' ')}</h1>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">PAINEL DO GARÇOM</p>
                    </div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-red-100"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8">
                <Tabs defaultValue="tables" className="space-y-6">
                    <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto h-16 p-2 rounded-[2rem] bg-white border border-border/40 shadow-sm">
                        <TabsTrigger value="tables" className="rounded-[1.5rem] gap-2 font-black text-xs uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">
                            <Armchair className="w-4 h-4" /> MAPA
                        </TabsTrigger>
                        <TabsTrigger value="kitchen" className="rounded-[1.5rem] gap-2 font-black text-xs uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">
                            <ChefHat className="w-4 h-4" /> PEDIDOS
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tables" className="h-full mt-0 animate-in fade-in duration-500">
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-black/5 min-h-[600px] border border-border/40 overflow-hidden">
                             <StaffTables />
                        </div>
                    </TabsContent>

                    <TabsContent value="kitchen" className="h-full mt-0 animate-in fade-in duration-500">
                         <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-black/5 min-h-[600px] border border-border/40 overflow-hidden">
                             <AdminKitchen />
                         </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Float Info */}
            <footer className="p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40 italic">
                    EzMenu Professional Staff v1.0
                </p>
            </footer>
        </div>
    );
};
