import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground animate-in fade-in">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-destructive" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Ops! Algo deu errado.</h1>
                            <p className="text-muted-foreground">
                                Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
                            </p>
                        </div>

                        <div className="p-4 bg-secondary/50 rounded-lg text-left text-xs font-mono text-muted-foreground overflow-auto max-h-40 border border-border">
                            {this.state.error?.message || 'Erro desconhecido'}
                        </div>

                        <div className="flex justify-center gap-4">
                            <Button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                                variant="destructive"
                            >
                                Limpar Dados e Recarregar
                            </Button>
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                className="gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Tentar Novamente
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
