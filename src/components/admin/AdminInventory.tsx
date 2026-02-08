import { useState } from 'react';
import { useInventory, InventoryItem } from '@/contexts/InventoryContext';
import { Package, AlertTriangle, Plus, Search, BatteryWarning, CheckCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AddIngredientDialog } from './AddIngredientDialog';



export function AdminInventory() {
    const { inventoryItems, updateStock, addStock, addIngredient, isLoading } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [isAddOpen, setIsAddOpen] = useState(false);

    // New Ingredient Form State
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: '', category: '', unit: 'g', quantity: 0, minThreshold: 1000
    });

    // Derived state
    const categories = ['Todos', ...Array.from(new Set(inventoryItems.map(i => i.category)))];

    const filteredItems = inventoryItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Helper to get status color
    const getStatusColor = (item: InventoryItem) => {
        if (item.quantity === 0) return 'text-red-600 bg-red-100 border-red-200';
        if (item.quantity <= item.minThreshold) return 'text-amber-600 bg-amber-100 border-amber-200';
        return 'text-emerald-600 bg-emerald-100 border-emerald-200';
    };

    const handleCreateIngredient = () => {
        if (!newItem.name || !newItem.category) {
            toast.error('Preencha nome e categoria!');
            return;
        }

        const id = newItem.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
        addIngredient({
            id,
            name: newItem.name,
            category: newItem.category,
            unit: newItem.unit || 'g',
            quantity: Number(newItem.quantity) || 0,
            minThreshold: Number(newItem.minThreshold) || 500
        });
        setIsAddOpen(false);
        setNewItem({ name: '', category: '', unit: 'g', quantity: 0, minThreshold: 1000 });
    };

    const QuickAddButton = ({ itemId, amount }: { itemId: string, amount: number }) => (
        <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => addStock(itemId, amount)}
        >
            +{amount}
        </Button>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Package className="w-8 h-8 text-primary" />
                        Gestão de Estoques
                    </h2>
                    <p className="text-muted-foreground mt-1">Gerencie insumos e níveis de estoque.</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedCategory === cat
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border hover:border-primary/50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 w-full md:w-auto">


                    <div className="relative flex-1 md:flex-none md:w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar insumo..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <AddIngredientDialog
                        trigger={
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> Novo Insumo
                            </Button>
                        }
                    />
                </div>
            </div>

            {/* Inventory Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Nenhum insumo encontrado</h3>
                    <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6">
                        {searchTerm || selectedCategory !== 'Todos'
                            ? "Tente ajustar seus filtros de busca."
                            : "Cadastre seus primeiros insumos para começar a controlar o estoque."}
                    </p>
                    {searchTerm || selectedCategory !== 'Todos' ? (
                        <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); }}>
                            Limpar Filtros
                        </Button>
                    ) : (
                        <AddIngredientDialog
                            trigger={
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" /> Cadastrar Primeiro Insumo
                                </Button>
                            }
                        />
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => {
                        const isCritical = item.quantity <= item.minThreshold;
                        const isOut = item.quantity === 0;

                        return (
                            <div
                                key={item.id}
                                className={`
                                relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md
                                ${isOut ? 'opacity-90 border-red-200' : 'border-border'}
                            `}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.category}</span>
                                        <h3 className="text-lg font-bold text-foreground mt-1">{item.name}</h3>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(item)}`}>
                                        {isOut ? <AlertTriangle className="w-3.5 h-3.5" /> :
                                            isCritical ? <BatteryWarning className="w-3.5 h-3.5" /> :
                                                <CheckCircle className="w-3.5 h-3.5" />}
                                        {isOut ? 'ESGOTADO' : isCritical ? 'CRÍTICO' : 'NORMAL'}
                                    </div>
                                </div>

                                {/* Main Value */}
                                <div className="mb-6">
                                    {/* Smart Unit Conversion Display */}
                                    {(() => {
                                        let displayQty = item.quantity;
                                        let displayUnit = item.unit;

                                        if (item.unit === 'g' && item.quantity >= 1000) {
                                            displayQty = item.quantity / 1000;
                                            displayUnit = 'kg';
                                        }

                                        return (
                                            <div className="flex items-baseline gap-1">
                                                <span className={`text-4xl font-extrabold tracking-tight ${isOut ? 'text-red-500' : 'text-foreground'}`}>
                                                    {displayQty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                                </span>
                                                <span className="text-muted-foreground font-medium">{displayUnit}</span>
                                            </div>
                                        );
                                    })()}
                                    <div className="w-full bg-secondary/50 h-2 rounded-full mt-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isOut ? 'bg-red-500' : isCritical ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, (item.quantity / (item.minThreshold * 3)) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                        Ponto Crítico: <span className="font-medium text-foreground">{item.minThreshold} {item.unit}</span>
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="bg-secondary/20 -mx-6 -mb-6 p-4 border-t border-border/50 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-muted-foreground">Entrada Rápida</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <QuickAddButton itemId={item.id} amount={item.unit === 'g' || item.unit === 'ml' ? 500 : 10} />
                                        <QuickAddButton itemId={item.id} amount={item.unit === 'g' || item.unit === 'ml' ? 1000 : 50} />
                                        <QuickAddButton itemId={item.id} amount={item.unit === 'g' || item.unit === 'ml' ? 5000 : 100} />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="relative flex-1">
                                            <Input
                                                type="number"
                                                placeholder="Adicionar qtd..."
                                                className="h-9 bg-background text-sm pr-8"
                                                id={`stock-input-${item.id}`}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const input = e.currentTarget as HTMLInputElement;
                                                        const val = parseInt(input.value);
                                                        if (!isNaN(val) && val > 0) {
                                                            addStock(item.id, val);
                                                            toast.success(`+${val}${item.unit} adicionado em ${item.name}`);
                                                            input.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-9 w-9 border border-input hover:bg-emerald-500 hover:text-white transition-colors"
                                            onClick={() => {
                                                const input = document.getElementById(`stock-input-${item.id}`) as HTMLInputElement;
                                                if (input) {
                                                    const val = parseInt(input.value);
                                                    if (!isNaN(val) && val > 0) {
                                                        addStock(item.id, val);
                                                        toast.success(`+${val}${item.unit} adicionado em ${item.name}`);
                                                        input.value = '';
                                                    }
                                                }
                                            }}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
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
