import { useState } from 'react';
import { useMenu, Category } from '@/contexts/MenuContext';
import { MenuItem } from '@/contexts/OrderContext';
import { Plus, Edit2, Trash2, Search, X, Check, Image as ImageIcon, LayoutGrid, Tag } from 'lucide-react';
import { toast } from 'sonner';

type ActiveTab = 'items' | 'categories';

export function AdminMenu() {
    const { items, categories, alacarteCategories, addItem, updateItem, deleteItem, addCategory, updateCategory, deleteCategory, isLoading } = useMenu();
    const allCategories = [...categories, ...alacarteCategories].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

    const [activeTab, setActiveTab] = useState<ActiveTab>('items');

    // Item list state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState<Partial<MenuItem>>({
        name: '', description: '', price: 0, image: '',
        category: allCategories[0]?.id || '',
        isRodizio: true, station: 'kitchen'
    });

    // Category list state
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [catFormData, setCatFormData] = useState({ name: '', icon: '🍱', type: 'rodizio' });

    // ─── Item Handlers ────────────────────────────────────────────────
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleEditItem = (item: MenuItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsItemModalOpen(true);
    };

    const handleDeleteItem = (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
            deleteItem(id);
            toast.success('Item excluído com sucesso');
        }
    };

    const handleAddNewItem = () => {
        setEditingItem(null);
        setFormData({
            name: '', description: '', price: 0, image: '',
            category: allCategories[0]?.id || '',
            isRodizio: true, station: 'kitchen',
            code: `P${Math.floor(Math.random() * 1000)}`
        });
        setIsItemModalOpen(true);
    };

    const handleSubmitItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.price || !formData.category) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }
        if (editingItem) {
            updateItem(editingItem.id, formData);
            toast.success('Item atualizado com sucesso');
        } else {
            // @ts-ignore
            addItem(formData);
            toast.success('Item criado com sucesso');
        }
        setIsItemModalOpen(false);
    };

    // ─── Category Handlers ────────────────────────────────────────────
    const allCats = [...categories, ...alacarteCategories].filter(cat => !cat.name?.toUpperCase().includes('SISTEMA'));

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catFormData.name) return toast.error('Nome é obrigatório');
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.dbId || editingCategory.id, catFormData);
                toast.success('Categoria atualizada');
            } else {
                await addCategory(catFormData);
                toast.success('Categoria criada');
            }
            setIsCatModalOpen(false);
            setEditingCategory(null);
            setCatFormData({ name: '', icon: '🍱', type: 'rodizio' });
        } catch {
            toast.error('Erro ao salvar categoria');
        }
    };

    const handleEditCategory = (cat: Category) => {
        setEditingCategory(cat);
        setCatFormData({ name: cat.name, icon: cat.icon, type: (cat as any).type || 'rodizio' });
        setIsCatModalOpen(true);
    };

    // ─── Loading ──────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="h-8 w-48 bg-zinc-100 rounded-lg animate-pulse" />
                <div className="h-14 w-full bg-zinc-50 rounded-2xl animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 w-full bg-zinc-50 rounded-2xl animate-pulse border border-zinc-100" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Cardápio</h1>
                    <p className="text-zinc-500 text-sm mt-0.5">Gerencie itens e categorias do seu menu.</p>
                </div>
                <button
                    onClick={activeTab === 'items' ? handleAddNewItem : () => {
                        setEditingCategory(null);
                        setCatFormData({ name: '', icon: '🍱', type: 'rodizio' });
                        setIsCatModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-all duration-200 shadow-sm active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    {activeTab === 'items' ? 'Novo Item' : 'Nova Categoria'}
                </button>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-0 border-b border-zinc-200">
                {([
                    { id: 'items', label: 'Itens do Cardápio', icon: Tag },
                    { id: 'categories', label: 'Categorias', icon: LayoutGrid },
                ] as { id: ActiveTab; label: string; icon: React.ElementType }[]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${activeTab === tab.id
                            ? 'border-zinc-900 text-zinc-900'
                            : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ──────────────── ITEMS TAB ──────────────── */}
            {activeTab === 'items' && (
                <div className="space-y-5">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou código..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 outline-none transition-all placeholder:text-zinc-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="w-full sm:w-56 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm outline-none focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 cursor-pointer appearance-none text-zinc-700"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">Todas as Categorias</option>
                            {allCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-zinc-50 border-b border-zinc-100">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Produto</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Categoria</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Preço</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-center">Rodízio</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="group hover:bg-zinc-50/70 transition-colors duration-150">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 group-hover:border-zinc-300 transition-colors">
                                                    {item.image
                                                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        : <ImageIcon className="w-5 h-5 text-zinc-300" />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-zinc-900">{item.name}</p>
                                                    <p className="text-xs text-zinc-400 truncate max-w-[200px] mt-0.5">{item.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-zinc-100 text-[11px] font-semibold text-zinc-500 border border-zinc-200">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                                R$ {item.price.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {item.isRodizio
                                                ? <div className="inline-flex items-center justify-center w-6 h-6 bg-zinc-900 text-white rounded-full">
                                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                </div>
                                                : <span className="text-zinc-300 text-lg">–</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-1">
                                            <button
                                                onClick={() => handleEditItem(item)}
                                                className="p-2 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-lg transition-all duration-150"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item.id, item.name)}
                                                className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-all duration-150"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                                <Search className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium">Nenhum item encontrado.</p>
                                <p className="text-xs mt-1 opacity-60">Tente outro termo ou categoria.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ──────────────── CATEGORIES TAB ──────────────── */}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {allCats.map((cat: any) => (
                        <div
                            key={cat.dbId || cat.id}
                            className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center text-2xl border border-zinc-200">
                                    {cat.icon}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditCategory(cat)}
                                        className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Excluir esta categoria?')) {
                                                deleteCategory(cat.dbId || cat.id);
                                                toast.success('Categoria excluída');
                                            }
                                        }}
                                        className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-sm text-zinc-900 leading-tight">{cat.name}</h3>
                            <div className="mt-2 inline-flex px-2.5 py-1 rounded-lg bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                {cat.type === 'alacarte' ? 'À La Carte' : 'Rodízio'}
                            </div>
                        </div>
                    ))}
                    {allCats.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-400">
                            <LayoutGrid className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm font-medium">Nenhuma categoria criada.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ──────────────── ITEM MODAL ──────────────── */}
            {isItemModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900">
                                    {editingItem ? 'Editar Produto' : 'Novo Produto'}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">Preencha os detalhes abaixo.</p>
                            </div>
                            <button
                                onClick={() => setIsItemModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitItem} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-600">Nome *</label>
                                    <input
                                        required
                                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 outline-none transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-600">Código (Opcional)</label>
                                    <input
                                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 outline-none transition-all"
                                        value={formData.code || ''}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-600">Descrição</label>
                                <textarea
                                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 outline-none transition-all min-h-[80px] resize-none"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-600">Preço (R$) *</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 outline-none transition-all"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-600">Categoria *</label>
                                    <select
                                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 outline-none transition-all bg-white"
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

                            {/* Image Upload */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-600">Imagem</label>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 hover:border-zinc-400 transition-all group">
                                            <div className="flex flex-col items-center justify-center py-4">
                                                <ImageIcon className="w-7 h-7 text-zinc-300 mb-2 group-hover:text-zinc-500 transition-colors" />
                                                <p className="text-xs text-zinc-400"><span className="font-semibold text-zinc-600">Clique para enviar</span> ou arraste</p>
                                                <p className="text-[10px] text-zinc-300 mt-0.5">JPG, PNG ou WebP</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                    {formData.image && (
                                        <div className="w-28 h-28 rounded-xl bg-zinc-100 shrink-0 overflow-hidden border border-zinc-200 relative group">
                                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full p-1.5 backdrop-blur-sm transition-all"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-600">Estação de Preparo</label>
                                    <select
                                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 outline-none transition-all bg-white"
                                        value={formData.station || 'kitchen'}
                                        onChange={e => setFormData({ ...formData, station: e.target.value as any })}
                                    >
                                        <option value="kitchen">Cozinha</option>
                                        <option value="sushi">Sushi Bar</option>
                                        <option value="bar">Bar / Copa</option>
                                    </select>
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl hover:bg-zinc-50 transition-colors w-full">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
                                            checked={formData.isRodizio}
                                            onChange={e => setFormData({ ...formData, isRodizio: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium text-zinc-700">Incluso no Rodízio</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-100">
                                <button
                                    type="button"
                                    onClick={() => setIsItemModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ──────────────── CATEGORY MODAL ──────────────── */}
            {isCatModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                            <h3 className="text-lg font-bold text-zinc-900">
                                {editingCategory ? 'Editar' : 'Nova'} Categoria
                            </h3>
                            <button onClick={() => setIsCatModalOpen(false)} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-600">Nome *</label>
                                <input
                                    required
                                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-200 outline-none transition-all"
                                    value={catFormData.name}
                                    onChange={e => setCatFormData({ ...catFormData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-600">Ícone (Emoji)</label>
                                    <input
                                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-center text-2xl focus:ring-2 focus:ring-zinc-200 outline-none transition-all"
                                        value={catFormData.icon}
                                        onChange={e => setCatFormData({ ...catFormData, icon: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-600">Tipo</label>
                                    <select
                                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:ring-2 focus:ring-zinc-200 outline-none transition-all"
                                        value={catFormData.type}
                                        onChange={e => setCatFormData({ ...catFormData, type: e.target.value })}
                                    >
                                        <option value="rodizio">Rodízio</option>
                                        <option value="alacarte">À La Carte</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCatModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
                                >
                                    Salvar Categoria
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
