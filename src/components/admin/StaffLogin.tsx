
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, User, KeyRound, ArrowRight } from 'lucide-react';
import { BrandingLogo } from '../BrandingLogo';

export function StaffLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, establishment_id')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile?.role === 'waiter' || profile?.role === 'admin') {
                    const { data: est } = await supabase
                        .from('establishments')
                        .select('slug')
                        .eq('id', profile.establishment_id)
                        .single();
                    if (est?.slug) navigate(`/${est.slug}/equipe`);
                }
            }
        };
        checkSession();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Logout first to ensure clean state
            await supabase.auth.signOut();

            const { data: { user }, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            if (!user) throw new Error("Acesso negado");

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, establishment_id')
                .eq('id', user.id)
                .single();

            if (!profile) throw new Error("Perfil não encontrado");
            if (profile.role !== 'waiter' && profile.role !== 'admin') {
                await supabase.auth.signOut();
                throw new Error("Este acesso é restrito à equipe.");
            }

            const { data: est } = await supabase
                .from('establishments')
                .select('slug')
                .eq('id', profile.establishment_id)
                .single();

            if (est?.slug) {
                toast.success('Bem-vindo ao turno!');
                navigate(`/${est.slug}/equipe`);
            } else {
                throw new Error("Restaurante não configurado");
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao entrar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-[420px] bg-white rounded-[3rem] shadow-2xl shadow-black/5 border border-border/40 p-10 relative overflow-hidden">
                {/* Branding Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full -ml-16 -mb-16 blur-2xl" />

                <div className="flex flex-col items-center text-center mb-10 relative z-10">
                    <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mb-6 shadow-inner ring-4 ring-primary/5">
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 leading-none mb-2">Portal da Equipe</h1>
                    <p className="text-[10px] font-bold text-neutral-400 tracking-[0.25em] uppercase">EzMenu Staff Professional</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4">E-mail Profissional</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center text-neutral-400 group-focus-within:text-primary transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-secondary/30 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none transition-all font-medium placeholder:text-neutral-300"
                                placeholder="garcom@restaurante.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4">Senha de Acesso</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center text-neutral-400 group-focus-within:text-primary transition-colors">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-secondary/30 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none transition-all font-medium placeholder:text-neutral-300"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white font-black uppercase tracking-[0.2em] py-5 rounded-[1.8rem] hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 group mt-4 h-16"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                Iniciar Turno
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    
                    <div className="pt-4 text-center">
                        <button 
                            type="button"
                            onClick={() => navigate('/admin')}
                            className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors"
                        >
                            Acesso do Proprietário
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Footer Sign */}
            <p className="mt-12 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] opacity-50">
                EzMenu &copy; 2026 Admin Suite
            </p>
        </div>
    );
}
