import { useState } from 'react';
import { useInventory, InventoryItem } from '@/contexts/InventoryContext';
import { Package, AlertTriangle, Plus, Search, Zap, CheckCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AddIngredientDialog } from './AddIngredientDialog';

const STATUS_CONFIG = {
    out:      { label: 'ESGOTADO', color: 'bg-red-100 text-red-600 border-red-200',     bar: 'bg-red-500',     card: 'border-red-200/60 bg-red-50/30' },
    critical: { label: 'CRÍTICO',  color: 'bg-amber-100 text-amber-600 border-amber-200', bar: 'bg-amber-500',   card: 'border-amber-200/60' },
    ok:       { label: 'NORMAL',   color: 'bg-emerald-100 text-emerald-600 border-emerald-200', bar: 'bg-emerald-500', card: 'border-zinc-100' },
};

const getStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return 'out';
    if (item.quantity <= item.minThreshold) return 'critical';
    return 'ok';
};

const formatQty = (item: InventoryItem) => {
    if (item.unit === 'g' && item.quantity >= 1000) return { qty: (item.quantity / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }), unit: 'kg' };
    return { qty: item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), unit: item.unit };
};

const miniAmounts = (unit: string) => unit === 'g' || unit === 'ml' ? [500, 1000, 5000] : [5, 10, 50];

export function AdminInventory() {
    const { inventoryItems, addStock, addIngredient, isLoading } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [customInput, setCustomInput] = useState<Record<string, string>>({});

    const categories = ['Todos', ...Array.from(new Set(inventoryItems.map(i => i.category).filter(Boolean)))];
    const filtered = inventoryItems.filter(i =>
        (selectedCategory === 'Todos' || i.category === selectedCategory) &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const criticalCount = inventoryItems.filter(i => getStatus(i) !== 'ok').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Estoque</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Gerencie insumos e níveis de reposição.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    {criticalCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-amber-700">{criticalCount} item{criticalCount > 1 ? 's' : ''} crítico{criticalCount > 1 ? 's' : ''}</span>
                        </div>
                    )}
                    <AddIngredientDialog trigger={
                        <button className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors active:scale-95">
                            <Plus className="w-4 h-4" /> Novo Insumo
                        </button>
                    } />
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar insumo…" className="pl-9 h-10 rounded-xl border-zinc-200 text-sm" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedCategory === cat
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-zinc-100 animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                    <Package className="w-10 h-10 mb-3 opacity-30" />
                    <p className="font-semibold text-sm">Nenhum insumo encontrado</p>
                    <p className="text-xs mt-1">Ajuste os filtros ou cadastre um novo insumo</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(item => {
                        const status = getStatus(item);
                        const cfg = STATUS_CONFIG[status];
                        const { qty, unit } = formatQty(item);
                        const pct = Math.min(100, (item.quantity / Math.max(item.minThreshold * 2.5, 1)) * 100);
                        const amounts = miniAmounts(item.unit);

                        return (
                            <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${cfg.card}`}>
                                {/* Card Header */}
                                <div className="px-5 pt-5 pb-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">{item.category}</p>
                                            <h3 className="font-bold text-zinc-900 text-base leading-tight">{item.name}</h3>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 ${cfg.color}`}>
                                            {status === 'out' ? <AlertTriangle className="w-2.5 h-2.5" /> : status === 'critical' ? <AlertTriangle className="w-2.5 h-2.5" /> : <CheckCircle className="w-2.5 h-2.5" />}
                                            {cfg.label}
                                        </span>
                                    </div>

                                    {/* Quantity */}
                                    <div className="flex items-baseline gap-1.5 mb-3">
                                        <span className={`text-3xl font-black tracking-tight ${status === 'out' ? 'text-red-500' : 'text-zinc-900'}`}>{qty}</span>
                                        <span className="text-sm font-semibold text-zinc-400">{unit}</span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-1.5">
                                        <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="text-[10px] text-zinc-400 font-medium">Mín: {item.minThreshold} {item.unit}</p>
                                </div>

                                {/* Quick Add */}
                                <div className="bg-zinc-50 border-t border-zinc-100 px-5 py-3 flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                    {amounts.map(amt => (
                                        <button key={amt} onClick={() => { addStock(item.id, amt); toast.success(`+${amt}${item.unit}`); }}
                                            className="flex-1 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all active:scale-95">
                                            +{amt >= 1000 ? `${amt / 1000}k` : amt}
                                        </button>
                                    ))}
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            placeholder="Qtd"
                                            value={customInput[item.id] || ''}
                                            onChange={e => setCustomInput(p => ({ ...p, [item.id]: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    const val = parseInt(customInput[item.id] || '0');
                                                    if (val > 0) {
                                                        addStock(item.id, val);
                                                        toast.success(`+${val}${item.unit} em ${item.name}`);
                                                        setCustomInput(p => ({ ...p, [item.id]: '' }));
                                                    }
                                                }
                                            }}
                                            className="w-full h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
