import { useState } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { MenuItem } from '@/contexts/OrderContext';
import { Plus, Edit2, Trash2, Search, X, Check, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function AdminMenu() {
    const { items, categories, alacarteCategories, addItem, updateItem, deleteItem, isLoading } = useMenu();
    const allCategories = [...categories, ...alacarteCategories].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<MenuItem>>({
        name: '',
        description: '',
        price: 0,
        image: '',
        category: allCategories[0]?.id || '',
        isRodizio: true,
        station: 'kitchen'
    });

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleEdit = (item: MenuItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
            deleteItem(id);
            toast.success('Item excluído com sucesso');
        }
    };

    const handleAddNew = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            description: '',
            price: 0,
            image: '',
            category: allCategories[0]?.id || '',
            isRodizio: true,
            station: 'kitchen',
            code: `P${Math.floor(Math.random() * 1000)}`
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.price || !formData.category) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }

        if (editingItem) {
            updateItem(editingItem.id, formData);
            toast.success('Item atualizado com sucesso');
        } else {
            // @ts-ignore - ID is generated in context
            addItem(formData);
            toast.success('Item criado com sucesso');
        }
        setIsModalOpen(false);
    };


    // Loading State
    if (isLoading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                    <div className="h-12 w-32 bg-gray-200 rounded-2xl animate-pulse" />
                </div>
                <div className="h-14 w-full bg-gray-100 rounded-2xl animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 w-full bg-gray-50 rounded-3xl animate-pulse border border-gray-100" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Gerenciar Cardápio</h2>
                    <p className="text-muted-foreground mt-1 text-lg">Adicione, edite ou remova itens do menu.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                    <Plus className="w-5 h-5" />
                    Novo Item
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou código..."
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border/60 bg-card shadow-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <select
                        className="w-full sm:w-64 px-4 py-4 rounded-2xl border border-border/60 bg-card shadow-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 cursor-pointer appearance-none transition-all font-medium text-foreground/80"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="all">Todas as Categorias</option>
                        {allCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-card rounded-3xl border border-border/60 shadow-xl shadow-black/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border/60">
                        <tr>
                            <th className="p-6 font-medium pl-8">Produto</th>
                            <th className="p-6 font-medium">Categoria</th>
                            <th className="p-6 font-medium">Preço</th>
                            <th className="p-6 font-medium text-center">Rodízio</th>
                            <th className="p-6 font-medium text-right pr-8">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {filteredItems.map(item => (
                            <tr key={item.id} className="group hover:bg-muted/30 transition-colors duration-200">
                                <td className="p-5 pl-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-border/50 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                                            <p className="text-sm text-muted-foreground truncate max-w-[220px] font-medium opacity-80">{item.description}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className="inline-flex px-3 py-1 rounded-lg bg-secondary text-xs font-semibold uppercase tracking-wide text-muted-foreground border border-border/50">
                                        {item.category}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                        R$ {item.price.toFixed(2)}
                                    </span>
                                </td>
                                <td className="p-5 text-center">
                                    {item.isRodizio ? (
                                        <div className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full shadow-sm ring-4 ring-primary/5">
                                            <Check className="w-4 h-4" strokeWidth={3} />
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground/30 font-medium text-xl">-</span>
                                    )}
                                </td>
                                <td className="p-5 text-right space-x-2 pr-8">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-2.5 hover:bg-blue-50 text-muted-foreground hover:text-blue-600 rounded-xl transition-all hover:scale-110 active:scale-95 duration-200"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4.5 h-4.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id, item.name)}
                                        className="p-2.5 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-xl transition-all hover:scale-110 active:scale-95 duration-200"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhum item encontrado.</p>
                        <p className="text-sm opacity-60">Tente buscar por outro termo ou categoria.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border/50 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-8 border-b border-border/50 bg-muted/20">
                            <div>
                                <h3 className="text-2xl font-bold text-foreground">
                                    {editingItem ? 'Editar Produto' : 'Novo Produto'}
                                </h3>
                                <p className="text-sm text-muted-foreground">Preencha os detalhes abaixo.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-full hover:bg-secondary transition-colors"
                            >
                                <X className="w-6 h-6 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nome</label>
                                    <input
                                        required
                                        className="w-full p-2 rounded-lg border border-border bg-background"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Código (Opcional)</label>
                                    <input
                                        className="w-full p-2 rounded-lg border border-border bg-background"
                                        value={formData.code || ''}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição</label>
                                <textarea
                                    className="w-full p-2 rounded-lg border border-border bg-background min-h-[80px]"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Preço (R$)</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full p-2 rounded-lg border border-border bg-background"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Categoria</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-border bg-background"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        {allCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Imagem</label>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/50 hover:border-primary/50 transition-all group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                                <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Clique para enviar</span> ou arraste</p>
                                                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setFormData({ ...formData, image: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                    {formData.image && (
                                        <div className="w-32 h-32 rounded-xl bg-secondary shrink-0 overflow-hidden border border-border shadow-sm group relative">
                                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full p-1.5 backdrop-blur-sm transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Estação de Preparo</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-border bg-background"
                                        value={formData.station || 'kitchen'}
                                        onChange={e => setFormData({ ...formData, station: e.target.value as any })}
                                    >
                                        <option value="kitchen">Cozinha</option>
                                        <option value="sushi">Sushi Bar</option>
                                        <option value="bar">Bar / Copa</option>
                                    </select>
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-input accent-primary cursor-pointer"
                                            checked={formData.isRodizio}
                                            onChange={e => setFormData({ ...formData, isRodizio: e.target.checked })}
                                        />
                                        <span className="font-medium">Incluído no Rodízio?</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-xl hover:bg-secondary transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:brightness-110"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
