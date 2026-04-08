import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, User, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BrandingLogo } from './BrandingLogo';

interface AccessScreenProps {
    onGranted: (name: string, email: string) => void;
    hasTable?: boolean;
    isLoading?: boolean;
}

export const AccessScreen: React.FC<AccessScreenProps> = ({ onGranted, hasTable = false, isLoading: isParentLoading = false }) => {

    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Combine local and parent loading states
    const effectiveLoading = isLoading || isParentLoading;
    
    const [error, setError] = useState('');

    const [establishmentId, setEstablishmentId] = useState<string | null>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';

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
            setError('Por favor, informe um e-mail válido.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email.trim().toLowerCase())
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
                const userName = data.full_name || email.split('@')[0];
                localStorage.setItem('ez_menu_client_name', userName);
                localStorage.setItem('ez_menu_client_email', email.trim().toLowerCase());
                onGranted(userName, email.trim().toLowerCase());
                toast.success(`Bem-vindo de volta, ${userName}!`);

            } else {
                setError('');
                toast.info('E-mail não encontrado. Por favor, crie sua conta.');
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

            onGranted(name.trim(), email.trim().toLowerCase());
            toast.success(`Bem-vindo, ${name}! Seu acesso foi liberado.`);

        } catch (e: any) {
            console.error("Register error:", e);
            toast.error("Erro ao realizar cadastro.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 w-full min-h-[100dvh] bg-[#FAFAFA] flex flex-col p-6 overflow-y-auto relative selection:bg-primary/20">
            
            {/* Elegant Abstract Premium Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <div className="absolute top-[-20%] -left-10 w-[70vw] h-[70vw] bg-primary/5 rounded-[100%] blur-[120px] opacity-60" />
                <div className="absolute bottom-[-10%] -right-20 w-[80vw] h-[80vw] bg-stone-300/20 rounded-[100%] blur-[120px] opacity-70" />
                <div className="absolute top-[30%] left-[10%] w-[50vw] h-[50vw] bg-white rounded-full blur-[80px] opacity-80" />
                
                {/* Very subtle noise texture for premium matte finish */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015]" />
            </div>

            {/* Top Logo - Enlarged */}
            <div className="w-full pt-12 flex items-center justify-center animate-in fade-in slide-in-from-top-4 duration-700 relative z-20">
                <BrandingLogo variant="dark" className="w-[300px] h-[120px]" showText={false} skipCustomization={true} />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards max-w-sm mx-auto w-full relative z-20 py-8">
                
                {/* Elevated Glass Form Card */}
                <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.02] rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden transition-all duration-300">
                    
                    {/* Inner highlight */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

                    {/* Hero / Greeting */}
                    <div className="mb-10 text-center relative">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 mb-3 drop-shadow-sm">
                            {mode === 'login' ? 'Bem-vindo' : 'Cadastre-se'}
                        </h2>
                        <div className="flex items-center justify-center gap-3 opacity-80">
                            <div className="h-px w-6 bg-gradient-to-r from-transparent to-primary/40" />
                            <p className="text-[10px] font-bold text-neutral-500 tracking-[0.25em] uppercase">
                                {mode === 'login' ? 'Identifique-se' : 'Crie sua conta VIP'}
                            </p>
                            <div className="h-px w-6 bg-gradient-to-l from-transparent to-primary/40" />
                        </div>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 text-xs text-red-600 bg-red-50/80 border border-red-100 rounded-2xl text-center font-bold animate-in zoom-in-95 duration-300">
                            {error}
                        </div>
                    )}

                    {/* Form Fields */}
                    <div className="space-y-4">
                        {mode === 'register' && (
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <User className="w-5 h-5 text-neutral-300 group-focus-within:text-primary transition-colors duration-500" />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nome Completo"
                                    className="w-full h-14 bg-white/50 border border-neutral-200/60 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-primary/50 focus:bg-white transition-all focus:ring-4 focus:ring-primary/10 shadow-sm"
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Mail className="w-5 h-5 text-neutral-300 group-focus-within:text-primary transition-colors duration-500" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full h-14 bg-white/50 border border-neutral-200/60 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-primary/50 focus:bg-white transition-all focus:ring-4 focus:ring-primary/10 shadow-sm"
                                onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <button
                        onClick={mode === 'login' ? handleLogin : handleRegister}
                        disabled={effectiveLoading}
                        className="w-full h-14 mt-8 bg-primary text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-primary/95 active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(237,27,46,0.25)] hover:shadow-[0_12px_35px_rgba(237,27,46,0.35)] disabled:opacity-50 disabled:pointer-events-none text-sm group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                        <div className="relative flex items-center gap-2">
                            {effectiveLoading ? (

                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Acessar' : 'Confirmar'} 
                                    <ArrowRight className="w-4 h-4 opacity-80 group-hover:translate-x-1.5 transition-transform duration-300" />
                                </>
                            )}
                        </div>
                    </button>

                    {/* Toggles */}
                    <div className="mt-8 space-y-6 flex flex-col items-center">
                        <button
                            onClick={() => {
                                setMode(mode === 'login' ? 'register' : 'login');
                                setError('');
                            }}
                            className="text-[11px] font-bold tracking-widest text-neutral-400 hover:text-neutral-800 transition-colors uppercase flex items-center justify-center group"
                        >
                            {mode === 'login' ? (
                                <>Nova reserva? <span className="ml-1 text-primary group-hover:text-primary/80 transition-colors">Criar Conta</span></>
                            ) : (
                                <><ArrowLeft className="w-3 h-3 mr-2 group-hover:-translate-x-1 transition-transform" /> Já tenho conta. <span className="ml-1 text-primary">Voltar</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
