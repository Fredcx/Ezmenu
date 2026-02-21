
import { useState } from 'react';
import { useMenu, Category } from '@/contexts/MenuContext';
import { Edit2, Trash2, Plus, X, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

export function AdminCategories() {
    const { categories, alacarteCategories, addCategory, updateCategory, deleteCategory, isLoading } = useMenu();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: '', icon: '🍱', type: 'rodizio' });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return toast.error('Nome é obrigatório');

        try {
            if (editingCategory) {
                await updateCategory(editingCategory.dbId || editingCategory.id, formData);
                toast.success('Categoria atualizada');
            } else {
                await addCategory(formData);
                toast.success('Categoria criada');
            }
            setIsModalOpen(false);
            setEditingCategory(null);
            setFormData({ name: '', icon: '🍱', type: 'rodizio' });
        } catch (e) {
            toast.error('Erro ao salvar categoria');
        }
    };

    const handleEdit = (cat: Category) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            icon: cat.icon,
            type: (cat as any).type || 'rodizio'
        });
        setIsModalOpen(true);
    };

    if (isLoading) return <div className="p-8 animate-pulse text-muted-foreground">Carregando categorias...</div>;

    const allCats = [...categories, ...alacarteCategories];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Gerenciar Categorias</h2>
                    <p className="text-muted-foreground mt-1 text-lg">Organize seu cardápio em seções dinâmicas.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setFormData({ name: '', icon: '🍱', type: 'rodizio' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                    <Plus className="w-5 h-5" />
                    Nova Categoria
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCats.map((cat: any) => (
                    <div key={cat.dbId || cat.id} className="bg-card p-6 rounded-[2rem] border border-border/40 shadow-premium group hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-inner border border-border/20">
                                {cat.icon}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(cat)}
                                    className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Excluir esta categoria?')) {
                                            deleteCategory(cat.dbId || cat.id);
                                            toast.success('Categoria excluída');
                                        }
                                    }}
                                    className="p-2 hover:bg-red-50 rounded-xl text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="font-black text-xl text-foreground uppercase tracking-tight">{cat.name}</h3>
                        <div className="mt-2 inline-flex px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                            {cat.type === 'alacarte' ? 'À La Carte' : 'Rodízio'}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border/50 animate-in zoom-in-95">
                        <div className="p-8 border-b border-border/50">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-bold">{editingCategory ? 'Editar' : 'Nova'} Categoria</h3>
                                <button onClick={() => setIsModalOpen(false)}><X /></button>
                            </div>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome</label>
                                <input
                                    required
                                    className="w-full p-4 rounded-xl border border-border bg-background"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Ícone (Emoji)</label>
                                    <input
                                        className="w-full p-4 rounded-xl border border-border bg-background text-center text-2xl"
                                        value={formData.icon}
                                        onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tipo</label>
                                    <select
                                        className="w-full p-4 rounded-xl border border-border bg-background"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="rodizio">Rodízio</option>
                                        <option value="alacarte">À La Carte</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold">
                                Salvar Categoria
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
