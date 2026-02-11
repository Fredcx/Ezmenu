import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, User, ArrowLeft, Fish } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AccessScreenProps {
    onAccessGranted: (name: string, email: string) => void;
}

export const AccessScreen: React.FC<AccessScreenProps> = ({ onAccessGranted }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        // Detect establishment from slug
        const detectEstablishment = async () => {
            const parts = window.location.pathname.split('/');
            const slug = parts[1];
            if (!slug || slug === 'admin' || slug === 'superadmin') return;

            const { data } = await supabase
                .from('establishments')
                .select('id')
                .eq('slug', slug)
                .single();

            if (data) {
                setEstablishmentId(data.id);
            }
        };
        detectEstablishment();

        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const handleLogin = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Por favor, informe seu e-mail corretamente.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            // Check if user exists in profiles
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email.trim().toLowerCase())
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
                // User exists
                const userName = data.full_name || email.split('@')[0];
                localStorage.setItem('ez_menu_client_name', userName);
                localStorage.setItem('ez_menu_client_email', email.trim().toLowerCase());
                onAccessGranted(userName, email.trim().toLowerCase());
                toast.success(`Bem-vindo de volta, ${userName}!`);
            } else {
                // User not found
                setError('E-mail não encontrado. Por favor, cadastre-se.');
                setMode('register');
            }
        } catch (e: any) {
            console.error("Login error:", e);
            toast.error("Erro ao autenticar. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !email.includes('@')) {
            setError('Por favor, preencha todos os campos corretamente.');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Create user profile
            // Profiles table: [id, email, role, created_at, establishment_id]
            const { error: insertError } = await supabase
                .from('profiles')
                .upsert({
                    email: email.trim().toLowerCase(),
                    full_name: name.trim(),
                    role: 'customer',
                    establishment_id: establishmentId || null
                }, { onConflict: 'email' });

            if (insertError) throw insertError;

            localStorage.setItem('ez_menu_client_name', name.trim());
            localStorage.setItem('ez_menu_client_email', email.trim().toLowerCase());

            onAccessGranted(name.trim(), email.trim().toLowerCase());
            toast.success(`Bem-vindo, ${name}! Seu acesso foi liberado.`);
        } catch (e: any) {
            console.error("Register error:", e);
            toast.error("Erro ao realizar cadastro.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 w-full h-[100dvh] bg-transparent flex flex-col items-center justify-center p-6 overflow-hidden overscroll-none touch-none bg-black">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                    src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=2070&auto=format&fit=crop"
                    alt="Sushi Background"
                    className="w-full h-full object-cover opacity-60 animate-in fade-in duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </div>

            <div className="w-full max-sm z-10 animate-in slide-in-from-bottom-8 duration-700 fade-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(237,27,46,0.3)] hover:scale-105 transition-transform duration-500">
                        <Fish className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(237,27,46,0.5)]" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-center text-white mb-2 uppercase italic">
                        Ez Menu
                    </h1>
                    <p className="text-white/60 text-center px-4 font-light text-xs tracking-widest uppercase">
                        Experience & Tradition
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                    <div className="text-center space-y-1 mb-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {mode === 'login' ? 'Identifique-se' : 'Cadastre-se'}
                        </h2>
                        <p className="text-sm text-white/40">
                            {mode === 'login' ? 'Informe seu e-mail para continuar' : 'Crie sua conta rapidinho'}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 text-xs text-red-200 bg-red-500/20 border border-red-500/30 rounded-xl text-center font-medium animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {mode === 'register' && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold ml-1 text-white/50 uppercase tracking-widest flex items-center gap-2">
                                    <User className="w-3 h-3" /> Nome Completo
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Seu nome"
                                    className="flex h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-inner"
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold ml-1 text-white/50 uppercase tracking-widest flex items-center gap-2">
                                <Mail className="w-3 h-3" /> E-mail
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="flex h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <button
                        onClick={mode === 'login' ? handleLogin : handleRegister}
                        disabled={isLoading}
                        className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(237,27,46,0.3)] disabled:opacity-50 disabled:pointer-events-none mt-4 text-sm"
                    >
                        {isLoading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                {mode === 'login' ? 'Entrar' : 'Cadastrar'} <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <div className="text-center pt-2 space-y-4">
                        <button
                            onClick={() => {
                                setMode(mode === 'login' ? 'register' : 'login');
                                setError('');
                            }}
                            className="text-xs text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            {mode === 'login' ? (
                                <>Ainda não tem conta? <span className="text-primary font-bold">Cadastre-se</span></>
                            ) : (
                                <><ArrowLeft className="w-3 h-3" /> Já tenho conta. <span className="text-primary font-bold">Voltar ao login</span></>
                            )}
                        </button>

                        <div className="flex items-center gap-4 px-4">
                            <div className="h-px flex-1 bg-white/5" />
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">ou</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>

                        <button
                            onClick={() => onAccessGranted('Visitante', '')}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-primary transition-colors py-2 px-8 rounded-xl border border-white/5 hover:border-primary/20 hover:bg-primary/5 mx-auto block"
                        >
                            Continuar como Visitante
                        </button>
                    </div>
                </div>

                <p className="text-[10px] text-center text-white/20 mt-12 uppercase tracking-[0.3em] font-medium">
                    Ez Menu Experience
                </p>
            </div>
        </div>
    );
};
