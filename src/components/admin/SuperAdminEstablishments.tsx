import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, Trash2, ExternalLink, Plus, Search, Loader2, Copy, Check, X, User, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Establishment {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
}

export const SuperAdminEstablishments = () => {
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Creation State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newRest, setNewRest] = useState({ name: '', slug: '', adminName: '', adminEmail: '', adminPassword: '', email: '' }); // Added email
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string, password: string } | null>(null);

    const fetchEstablishments = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('establishments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) toast.error("Erro ao carregar lojas.");
        else setEstablishments(data || []);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchEstablishments();
    }, []);

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewRest(prev => ({ ...prev, adminPassword: pass }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            // 1. Create Establishment
            const { data: estData, error: estError } = await supabase
                .from('establishments')
                .insert({
                    name: newRest.name,
                    slug: newRest.slug.toLowerCase().replace(/\s+/g, '-'),
                    status: 'active'
                })
                .select()
                .single();

            if (estError) throw estError;

            // 2. Create Admin User via Edge Function
            const payload = {
                email: newRest.adminEmail,
                password: newRest.adminPassword,
                establishment_id: estData.id,
                name: newRest.adminName
            };
            console.log("Sending payload to function:", payload);

            const { data: funcData, error: funcError } = await supabase.functions.invoke('create-restaurant-admin', {
                body: payload
            });

            if (funcError || (funcData && funcData.error)) {
                console.error("Function Error Details:", funcError);
                console.error("Function Response Data:", funcData);
                const errorMsg = funcError?.message || (funcData && funcData.error) || "Erro desconhecido na função";

                // Show detailed error in toast for user debugging
                toast.error(`Erro ao criar usuário: ${errorMsg}`);

                // ROLLBACK: Delete the zombie establishment
                await supabase.from('establishments').delete().eq('id', estData.id);
                // ...

                if (String(errorMsg).includes('401') || String(errorMsg).includes('Unauthorized')) {
                    toast.error('Sessão expirada. Faça login novamente.', {
                        description: 'O restaurante não foi criado. Relogue como Super Admin.'
                    });
                } else if (String(errorMsg).includes('Failed to fetch')) {
                    toast.error('Erro de conexão (Deploy).', {
                        description: 'Verifique se a função foi deployada. O restaurante foi removido.'
                    });
                } else {
                    toast.error('Erro ao criar usuário. Restaurante removido.', {
                        description: errorMsg
                    });
                }
            } else {
                setCreatedCredentials({ email: newRest.adminEmail, password: newRest.adminPassword });
                toast.success("Restaurante e Admin criados com sucesso!");
                setIsCreateOpen(false);
                setNewRest({ name: '', slug: '', adminName: '', email: '', password: '' });
                fetchEstablishments();
            }

        } catch (error: any) {
            toast.error(error.message || "Erro ao criar restaurante");
        } finally {
            setIsCreating(false);
        }
    };


    const deleteEstablishment = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o restaurante "${name}"? Esta ação é IRREVERSÍVEL.`)) return;

        const { error } = await supabase.from('establishments').delete().eq('id', id);
        if (error) toast.error("Erro ao excluir estabelecimento.");
        else {
            toast.success("Estabelecimento removido com sucesso!");
            fetchEstablishments();
        }
    };

    const filtered = establishments.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <Store className="w-8 h-8 text-primary" /> Instituições
                    </h1>
                    <p className="text-muted-foreground mt-2 font-medium italic">Gerencie todos os restaurantes ativos e inativos na rede Ez Menu.</p>
                </div>
                <button
                    onClick={() => {
                        setNewRest({ name: '', slug: '', adminName: '', adminEmail: '', adminPassword: '' });
                        generatePassword();
                        setIsCreateOpen(true);
                    }}
                    className="bg-primary text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-all w-full md:w-auto justify-center"
                >
                    <Plus className="w-5 h-5" /> Novo Restaurante
                </button>
            </div>

            <div className="relative group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou slug..."
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border border-border/40 bg-card/50 shadow-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-muted/20 rounded-[2rem] animate-pulse border border-border/30" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-card border rounded-[2rem] p-20 text-center text-muted-foreground italic font-medium">
                    Nenhum restaurante encontrado.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((est) => (
                        <div key={est.id} className="bg-card border border-border/40 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Store className="w-8 h-8" />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${est.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {est.status}
                                </span>
                            </div>

                            <div className="space-y-1 mb-6">
                                <h3 className="font-black text-xl text-foreground group-hover:text-primary transition-colors">{est.name}</h3>
                                <div className="flex items-center gap-2">
                                    <code className="text-[10px] bg-muted px-2 py-0.5 rounded-lg text-muted-foreground font-mono">/{est.slug}</code>
                                    <span className="text-[10px] text-muted-foreground/50">•</span>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Desde {new Date(est.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-border/30">
                                <a
                                    href={`/${est.slug}/admin`}
                                    target="_blank"
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-primary rounded-xl font-bold text-xs hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                                >
                                    <ExternalLink className="w-4 h-4" /> Acessar Painel
                                </a>
                                <button
                                    onClick={() => deleteEstablishment(est.id, est.name)}
                                    className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                                    title="Remover Restaurante"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-background w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 border border-border/50">
                        <button
                            onClick={() => setIsCreateOpen(false)}
                            className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-muted-foreground" />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Plus className="w-6 h-6 text-primary" /> Novo Parceiro
                            </h2>
                            <p className="text-muted-foreground">Cadastre um novo estabelecimento e gere as credenciais de acesso.</p>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome do Restaurante</label>
                                    <div className="relative">
                                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            required
                                            value={newRest.name}
                                            onChange={e => {
                                                const name = e.target.value;
                                                const slug = name.toLowerCase()
                                                    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
                                                    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanum with hyphen
                                                    .replace(/^-+|-+$/g, ''); // Trim hyphens

                                                setNewRest(prev => ({
                                                    ...prev,
                                                    name,
                                                    slug: slug
                                                }));
                                            }}
                                            className="w-full pl-12 pr-4 h-14 bg-secondary/30 rounded-2xl border-none focus:ring-2 focus:ring-primary/50 outline-none font-medium"
                                            placeholder="Ex: Sushi House"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Slug (URL)</label>
                                    <div className="relative">
                                        <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            required
                                            readOnly
                                            value={newRest.slug}
                                            // onChange={e => setNewRest({ ...newRest, slug: e.target.value })} // Made read-only as requested implicitly
                                            className="w-full pl-12 pr-4 h-14 bg-muted/50 rounded-2xl border-none text-muted-foreground font-mono text-sm cursor-not-allowed"
                                            placeholder="ex: sushi-house"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border/50 pt-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Dados do Administrador
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome do Responsável</label>
                                        <input
                                            required
                                            value={newRest.adminName}
                                            onChange={e => setNewRest({ ...newRest, adminName: e.target.value })}
                                            className="w-full px-6 h-14 bg-secondary/30 rounded-2xl border-none focus:ring-2 focus:ring-primary/50 outline-none font-medium"
                                            placeholder="Ex: João da Silva"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail de Acesso</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                                <input
                                                    required
                                                    type="email"
                                                    value={newRest.adminEmail}
                                                    onChange={e => setNewRest({ ...newRest, adminEmail: e.target.value })}
                                                    className="w-full pl-12 pr-4 h-14 bg-secondary/30 rounded-2xl border-none focus:ring-2 focus:ring-primary/50 outline-none font-medium"
                                                    placeholder="admin@restaurante.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Senha</label>
                                                <button type="button" onClick={generatePassword} className="text-[10px] text-primary font-bold uppercase hover:underline">Gerar Nova</button>
                                            </div>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                                <input
                                                    required
                                                    type="text"
                                                    value={newRest.adminPassword}
                                                    onChange={e => setNewRest({ ...newRest, adminPassword: e.target.value })}
                                                    className="w-full pl-12 pr-4 h-14 bg-secondary/30 rounded-2xl border-none focus:ring-2 focus:ring-primary/50 outline-none font-mono text-sm tracking-wider"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full h-16 bg-primary text-white text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Criar Restaurante & Usuário'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* CREDENTIALS SUCCESS MODAL */}
            {createdCredentials && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 text-center space-y-6">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-10 h-10" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-black text-foreground">Sucesso!</h2>
                            <p className="text-muted-foreground font-medium">Restaurante e Usuário Admin criados.</p>
                        </div>

                        <div className="bg-zinc-100 rounded-3xl p-6 text-left space-y-4 border border-zinc-200">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">E-mail</label>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-lg text-foreground">{createdCredentials.email}</span>
                                    <button onClick={() => { navigator.clipboard.writeText(createdCredentials.email); toast.success("Copiado!"); }} className="p-2 hover:bg-white rounded-xl transition-colors"><Copy className="w-4 h-4 text-zinc-400" /></button>
                                </div>
                            </div>
                            <div className="border-t border-zinc-200 pt-4">
                                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Senha</label>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-lg text-foreground font-bold tracking-wider">{createdCredentials.password}</span>
                                    <button onClick={() => { navigator.clipboard.writeText(createdCredentials.password); toast.success("Copiado!"); }} className="p-2 hover:bg-white rounded-xl transition-colors"><Copy className="w-4 h-4 text-zinc-400" /></button>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl">
                            ⚠️ Copie a senha agora. Não será possível visualizá-la novamente.
                        </p>

                        <button
                            onClick={() => setCreatedCredentials(null)}
                            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
