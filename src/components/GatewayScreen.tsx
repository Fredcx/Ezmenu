import { useState, useEffect } from 'react';
import { Armchair, BookOpen, ChevronRight, Users } from 'lucide-react';
import { BrandingLogo } from './BrandingLogo';
import { useMenu } from '@/contexts/MenuContext';

interface GatewayScreenProps {
    onOccupyTable: () => void;
    onViewMenu: () => void;
    tableName: string | null;
}

export function GatewayScreen({ onOccupyTable, onViewMenu, tableName }: GatewayScreenProps) {
    const { establishment } = useMenu();

    return (
        <div className="fixed inset-0 w-full h-[100dvh] bg-background flex flex-col p-6 overflow-hidden relative selection:bg-primary/20">
            {/* Elegant Abstract Premium Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <div className="absolute top-[-20%] -left-10 w-[70vw] h-[70vw] bg-primary/5 rounded-[100%] blur-[120px] opacity-60" />
                <div className="absolute bottom-[-10%] -right-20 w-[80vw] h-[80vw] bg-stone-300/20 rounded-[100%] blur-[120px] opacity-70" />
                <div className="absolute top-[30%] left-[10%] w-[50vw] h-[50vw] bg-white rounded-full blur-[80px] opacity-80" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015]" />
            </div>

            {/* Top Area: Logo & Table */}
            <div className="flex-1 flex flex-col items-center justify-center z-20 animate-in fade-in slide-in-from-top-10 duration-1000">
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-primary/10 blur-[40px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />
                    <div className="relative w-40 h-40 bg-white rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 overflow-hidden flex items-center justify-center p-5 transition-premium hover:-translate-y-2 active:scale-95">
                        <BrandingLogo variant="dark" className="w-full h-full" showText={false} />
                    </div>
                </div>

                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4 w-full">
                        <div className="h-[1px] w-8 bg-border" />
                        <span className="text-[11px] font-black tracking-[0.25em] text-muted-foreground uppercase">
                            {establishment?.name || 'EZMENU'}
                        </span>
                        <div className="h-[1px] w-8 bg-border" />
                    </div>
                    {tableName && (
                        <h1 className="text-5xl font-black uppercase text-foreground tracking-tighter drop-shadow-sm mb-2">
                            Mesa {tableName}
                        </h1>
                    )}
                    <h2 className="text-sm font-bold text-muted-foreground tracking-[0.1em] uppercase">
                        Bem-vindo ao nosso espaço
                    </h2>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-4 w-full max-w-sm mt-4">
                    <button
                        onClick={onOccupyTable}
                        className="w-full relative group overflow-hidden py-4 rounded-[2rem] flex flex-col items-center justify-center bg-primary text-white shadow-[0_15px_30px_rgba(237,27,46,0.3)] hover:-translate-y-1 active:scale-95 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                        
                        <div className="flex items-center gap-3 mb-0.5">
                            <Armchair className="w-5 h-5" />
                            <span className="text-lg font-black tracking-tight uppercase italic drop-shadow-md">
                                Ocupar Mesa
                            </span>
                            <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <span className="text-[10px] font-semibold text-white/80 mt-0.5">
                            Clique aqui para iniciar seus pedidos
                        </span>
                    </button>

                    <button
                        onClick={onViewMenu}
                        className="w-full py-4 rounded-[2rem] flex flex-col items-center justify-center bg-white/70 backdrop-blur-xl border border-border shadow-sm hover:border-black/10 active:scale-95 transition-all duration-300 text-foreground group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span className="text-sm font-bold tracking-widest uppercase">
                                Visualizar Cardápio
                            </span>
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                            Conheça nossos pratos sem compromisso
                        </span>
                    </button>
                    
                    <div className="flex items-center gap-3 text-muted-foreground/40 mt-6 justify-center">
                        <div className="h-[1px] w-4 bg-current" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-center">
                            Escolha uma Opção
                        </p>
                        <div className="h-[1px] w-4 bg-current" />
                    </div>
                </div>
            </div>
            
            {/* Footer Base */}
            <div className="py-6 flex flex-col items-center justify-center select-none z-20">
                <BrandingLogo variant="dark" className="w-[120px] h-[60px] opacity-40 grayscale" showText={false} skipCustomization={true} />
            </div>
        </div>
    );
}
