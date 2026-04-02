import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BrandingLogo } from '../BrandingLogo';

export function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const handleLogoutAndLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Sign out first to ensure we are logging in with new credentials
        await supabase.auth.signOut();
        handleLogin(e);
    };

    const handleLogin = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Get user profile to find their establishment
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não encontrado");

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, establishment_id')
                .eq('id', user.id)
                .single();

            if (!profile) throw new Error("Perfil não encontrado");

            if (profile.role === 'super_admin') {
                await supabase.auth.signOut();
                toast.error('Este portal é exclusivo para restaurantes. Use o portal Global.');
                navigate('/superadmin/login');
                return;
            }

            if (profile.establishment_id) {
                const { data: est } = await supabase
                    .from('establishments')
                    .select('slug')
                    .eq('id', profile.establishment_id)
                    .single();

                if (est?.slug) {
                    toast.success('Acesso autorizado!');
                    navigate(`/${est.slug}/admin`);
                } else {
                    toast.error("Estabelecimento não configurado");
                }
            } else {
                toast.error("Vínculo administrativo não encontrado");
            }
        } catch (error: any) {
            console.error("Login detail error:", error);
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                toast.error("Erro de conexão com o servidor. Verifique sua internet ou tente novamente em instantes.");
            } else {
                toast.error(error.message || 'Erro ao realizar login');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-secondary/30">
            <div className="w-full max-w-md bg-background p-8 rounded-2xl shadow-xl border border-border">
                <div className="flex flex-col items-center mb-10">
                    <BrandingLogo variant="dark" className="w-[180px] h-[70px] mb-4" showText={false} skipCustomization={true} />
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 mb-1">Acesso Gerencial</h1>
                    <p className="text-[10px] font-bold text-neutral-400 tracking-[0.25em] uppercase">Ez Menu Admin</p>
                </div>

                <form onSubmit={handleLogoutAndLogin} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full mt-1 p-3 bg-secondary/50 border border-transparent focus:border-primary/20 rounded-xl outline-none transition-all placeholder:text-muted-foreground/30"
                            placeholder="seu@email.com"
                            autoComplete="username"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium ml-1">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full mt-1 p-3 bg-secondary/50 border border-transparent focus:border-primary/20 rounded-xl outline-none transition-all placeholder:text-muted-foreground/30"
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 mt-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Acessar Painel'}
                    </button>
                </form>
            </div>
        </div>
    );
}
