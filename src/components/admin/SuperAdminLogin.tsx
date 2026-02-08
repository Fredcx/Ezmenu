import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function SuperAdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.role === 'super_admin') {
                    navigate('/superadmin');
                }
            }
        };
        checkAuth();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Force sign out of any existing session first
            await supabase.auth.signOut();

            const { data: { user }, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            if (!user) throw new Error("Falha na autenticação");

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'super_admin') {
                await supabase.auth.signOut();
                throw new Error("Acesso restrito a Super Administradores.");
            }

            toast.success('Login SuperAdmin realizado com sucesso!');
            navigate('/superadmin');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao realizar login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-zinc-950 p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Portal
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-primary/20">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Ez Menu Global</h1>
                    <p className="text-zinc-500 font-medium italic mt-1">Acesso exclusivo do proprietário da plataforma</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-zinc-500 ml-2 tracking-widest">Email de Root</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-14 bg-zinc-800/50 border border-zinc-700/50 text-white rounded-2xl px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-zinc-700"
                            placeholder="root@ezmenu.com"
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-zinc-500 ml-2 tracking-widest">Chave Mestra</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-14 bg-zinc-800/50 border border-zinc-700/50 text-white rounded-2xl px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-zinc-700"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Desbloquear Sistema'}
                    </button>
                </form>

                <div className="pt-6 border-t border-zinc-800 flex flex-col gap-4">
                    {/* Configuration mode removed as per user request */}
                </div>

                <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] pt-4">
                    Ez Menu v2.0 &copy; 2026
                </p>
            </div>
        </div>
    );
}
