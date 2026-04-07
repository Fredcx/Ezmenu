import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, UserPlus, Mail, Trash2, Loader2, Search, UserCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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

const COLORS = [
    'bg-rose-500', 'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500'
];
const getColor = (name: string) => COLORS[name?.charCodeAt(0) % COLORS.length] || COLORS[0];
const initials = (name: string) => name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

export const AdminStaff = () => {
    const { slug } = useParams();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data: est } = await supabase.from('establishments').select('id').eq('slug', slug).single();
                if (!est) return;
                setEstablishmentId(est.id);
                const { data: profiles } = await supabase.from('profiles').select('*').eq('establishment_id', est.id).eq('role', 'waiter');
                setStaff(profiles || []);
            } catch { toast.error('Erro ao carregar equipe'); }
            finally { setIsLoading(false); }
        };
        fetch();
    }, [slug]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!establishmentId) return;
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/create-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.name,
                    establishment_id: establishmentId
                })
            });

            const result = await response.json();
            
            if (!response.ok || !result.success) throw new Error(result.error || 'Erro ao criar conta');

            toast.success('Membro adicionado!');
            setIsAdding(false);
            setFormData({ name: '', email: '', password: '' });
            const { data: updated } = await supabase.from('profiles').select('*').eq('establishment_id', establishmentId).eq('role', 'waiter');
            setStaff(updated || []);
        } catch (err: any) { toast.error(err.message); }
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Remover ${name} da equipe?`)) return;
        try {
            await supabase.from('profiles').delete().eq('id', id);
            toast.success('Membro removido');
            setStaff(p => p.filter(s => s.id !== id));
        } catch { toast.error('Erro ao remover'); }
    };

    const filtered = staff.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Equipe</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Gerencie os acessos do seu time de salão.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
                >
                    <UserPlus className="w-4 h-4" /> Novo Garçom
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou e-mail…"
                    className="pl-9 h-10 rounded-xl border-zinc-200 text-sm" />
            </div>

            {/* Staff Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-zinc-100 animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                    <UserCheck className="w-10 h-10 mb-3 opacity-30" />
                    <p className="font-semibold text-sm">Nenhum membro cadastrado</p>
                    <p className="text-xs mt-1 mb-4">Adicione garçons para que acessem o sistema</p>
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-zinc-800 transition-all">
                        <UserPlus className="w-3.5 h-3.5" /> Adicionar Primeiro Membro
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(member => (
                        <div key={member.id} className="group bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
                            {/* Delete button */}
                            <button
                                onClick={() => handleDelete(member.id, member.full_name)}
                                className="absolute top-3 right-3 p-2 rounded-xl opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Avatar with initials */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-xl ${getColor(member.full_name)} flex items-center justify-center text-white font-black text-base shadow-sm shrink-0`}>
                                    {initials(member.full_name)}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-zinc-900 text-base leading-tight truncate">{member.full_name || 'Sem nome'}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Garçom Ativo</span>
                                    </div>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2.5 border border-zinc-100">
                                <Mail className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                <span className="text-xs font-medium text-zinc-500 truncate">{member.email}</span>
                            </div>

                            {/* Since */}
                            <p className="text-[10px] text-zinc-300 font-medium mt-3">
                                Desde {new Date(member.created_at).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogContent className="max-w-md rounded-2xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-zinc-400" /> Novo Membro da Equipe
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-sm mt-1">
                            Crie uma conta de acesso para o garçom.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAdd} className="space-y-4 mt-2">
                        {[
                            { id: 'name', label: 'Nome Completo', type: 'text', placeholder: 'Ex: Carlos Silva', key: 'name' },
                            { id: 'email', label: 'E-mail de Acesso', type: 'email', placeholder: 'carlos@email.com', key: 'email' },
                            { id: 'pass', label: 'Senha Provisória', type: 'password', placeholder: '••••••', key: 'password' },
                        ].map(field => (
                            <div key={field.id} className="space-y-1.5">
                                <Label htmlFor={field.id} className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{field.label}</Label>
                                <Input
                                    id={field.id}
                                    type={field.type}
                                    required
                                    placeholder={field.placeholder}
                                    className="h-11 rounded-xl border-zinc-200"
                                    value={(formData as any)[field.key]}
                                    onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                                />
                            </div>
                        ))}

                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
                                Informe o e-mail e senha ao garçom. Ele acessará pelo portal de login.
                            </p>
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} disabled={isSubmitting}
                                className="flex-1 h-11 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isSubmitting}
                                className="flex-1 h-11 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Conta'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
