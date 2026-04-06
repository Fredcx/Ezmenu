
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, UserPlus, Mail, Shield, Trash2, Loader2, Search, UserCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface StaffMember {
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
}

export const AdminStaff = () => {
    const { slug } = useParams();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Get Establishment ID
                const { data: est } = await supabase
                    .from('establishments')
                    .select('id')
                    .eq('slug', slug)
                    .single();
                
                if (est) {
                    setEstablishmentId(est.id);
                    
                    // 2. Get Staff Profiles
                    const { data: profiles, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('establishment_id', est.id)
                        .eq('role', 'waiter');
                    
                    if (error) throw error;
                    setStaff(profiles || []);
                }
            } catch (err) {
                console.error("Error fetching staff:", err);
                toast.error("Erro ao carregar equipe");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [slug]);

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!establishmentId) return;

        setIsSubmitting(true);
        try {
            // Chamar a RPC (Função de Banco de Dados)
            const { data: result, error: rpcError } = await supabase.rpc('create_staff_member', {
                p_email: formData.email,
                p_password: formData.password,
                p_full_name: formData.name,
                p_establishment_id: establishmentId
            });

            if (rpcError) throw rpcError;
            if (!result.success) {
                throw new Error(result.error || "Erro ao criar conta");
            }

            if (!result.success) {
                throw new Error(result.error || "Erro ao criar conta");
            }

            toast.success("Membro da equipe criado com sucesso!");
            setIsAdding(false);
            setFormData({ name: '', email: '', password: '' });
            
            // Refresh list
            const { data: newProfiles } = await supabase
                .from('profiles')
                .select('*')
                .eq('establishment_id', establishmentId)
                .eq('role', 'waiter');
            setStaff(newProfiles || []);

        } catch (err: any) {
            console.error(err);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStaff = async (id: string, name: string) => {
        if (!confirm(`Deseja realmente remover ${name} da equipe?`)) return;

        try {
            // Note: Deleting from profiles is easy, but deleting from Auth requires Admin API
            // For now, we'll just delete the profile or mark as inactive
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Membro removido");
            setStaff(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error(err);
            toast.error("Erro ao remover membro");
        }
    };

    const filteredStaff = staff.filter(s => 
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3 tracking-tighter">
                        <Users className="w-8 h-8 text-primary" /> EQUIPE
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium italic">Gerencie os acessos dos seus garçons e time de salão.</p>
                </div>
                <Button onClick={() => setIsAdding(true)} className="gap-2 rounded-2xl h-12 px-6 shadow-lg shadow-primary/20">
                    <UserPlus className="w-5 h-5" /> Novo Garçom
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-border/40 max-w-md">
                <Search className="w-5 h-5 ml-2 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nome ou e-mail..." 
                    className="border-none bg-transparent focus-visible:ring-0 px-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-48 rounded-[2rem] bg-muted/20 animate-pulse" />
                    ))
                ) : filteredStaff.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-card/30 rounded-[2.5rem] border-2 border-dashed border-border/40">
                        <UserCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">Nenhum membro da equipe cadastrado.</p>
                    </div>
                ) : (
                    filteredStaff.map((member) => (
                        <div key={member.id} className="group relative bg-card hover:bg-white transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-2xl hover:shadow-primary/5 flex flex-col items-center text-center overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleDeleteStaff(member.id, member.full_name)}
                                    className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-sm"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="w-20 h-20 bg-primary/5 rounded-[1.8rem] flex items-center justify-center mb-6 ring-4 ring-primary/5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                                <Shield className="w-10 h-10 text-primary" />
                            </div>

                            <h3 className="text-xl font-black uppercase tracking-tight mb-2 leading-tight">{member.full_name || 'Ex-Equipe'}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-4">
                                <Mail className="w-4 h-4 opacity-40" />
                                <span>{member.email}</span>
                            </div>

                            <div className="mt-2 flex items-center gap-2 bg-secondary/80 px-4 py-1.5 rounded-full border border-border/40">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">GARÇOM ATIVO</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Staff Modal */}
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogContent className="max-w-md w-[95vw] rounded-[2.5rem] p-8 gap-8 border border-white/40 bg-white/95 backdrop-blur-xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                            <UserPlus className="w-6 h-6 text-primary" /> Novo Membro
                        </DialogTitle>
                        <DialogDescription className="font-medium italic pt-2">
                            Crie uma conta de acesso para um novo garçom do seu restaurante.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddStaff} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">Nome Completo</Label>
                            <Input 
                                id="name" 
                                required
                                placeholder="Ex: Carlos Silva" 
                                className="h-12 rounded-xl focus:ring-primary/20"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">E-mail de Acesso</Label>
                            <Input 
                                id="email" 
                                type="email"
                                required
                                placeholder="carlos@exemplo.com" 
                                className="h-12 rounded-xl focus:ring-primary/20"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pass" className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">Senha Provisória</Label>
                            <Input 
                                id="pass" 
                                type="password"
                                required
                                minLength={6}
                                placeholder="******" 
                                className="h-12 rounded-xl focus:ring-primary/20"
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            />
                        </div>

                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
                            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-800 font-bold uppercase leading-relaxed tracking-wider">
                                Informe ao garçom o e-mail e a senha criados. Ele poderá acessar o sistema pela página de login padrão.
                            </p>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} disabled={isSubmitting}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting} className="rounded-xl h-12 shadow-lg shadow-primary/20 transition-all hover:-translate-y-1">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Conta'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
