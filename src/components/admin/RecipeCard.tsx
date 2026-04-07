import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, ChefHat, Edit3, X, ChevronRight } from 'lucide-react';
import { AddIngredientDialog } from './AddIngredientDialog';
import { useInventory } from '@/contexts/InventoryContext';

interface RecipeCardProps {
    product: any;
    recipe: any[]; // IngredientRequirement[]
    isEditing: boolean;
    onStartEditing: (id: string) => void;
    onStopEditing: () => void;
    onSave: (id: string, recipe: any[]) => void;
}

export function RecipeCard({
    product,
    recipe,
    isEditing,
    onStartEditing,
    onStopEditing,
    onSave
}: RecipeCardProps) {
    const { inventoryItems } = useInventory();
    const [tempRecipe, setTempRecipe] = useState(recipe);

    useEffect(() => {
        if (isEditing) {
            setTempRecipe(recipe);
        }
    }, [isEditing, recipe]);

    if (!isEditing) {
        return (
            <button
                onClick={() => onStartEditing(product.id)}
                className="relative group bg-white border border-zinc-200 rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 flex flex-col h-full"
            >
                {/* Header: Image + Title */}
                <div className="flex gap-4 items-center mb-5">
                    <div className="w-14 h-14 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">{product.name}</h3>
                        <div className="mt-1">
                            {recipe.length > 0 ? (
                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {recipe.length} Insumos
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                                    Sem Ficha
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview List */}
                <div className="flex-1">
                    {recipe.length > 0 ? (
                        <div className="space-y-2">
                            {recipe.slice(0, 3).map((req, idx) => {
                                const ing = inventoryItems.find(i => i.id === req.ingredientId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-500 font-medium">{ing?.name}</span>
                                        <span className="font-mono font-bold text-zinc-800">{req.amount}{ing?.unit}</span>
                                    </div>
                                )
                            })}
                            {recipe.length > 3 && (
                                <div className="text-xs text-zinc-400 font-bold mt-2 pt-2 border-t border-zinc-100">
                                    + {recipe.length - 3} outros itens
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-6 text-zinc-300">
                            <ChefHat className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-xs font-semibold">Nenhum ingrediente</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between text-zinc-400 group-hover:text-zinc-600 transition-colors">
                    <span className="text-xs font-bold">Editar Ficha</span>
                    <ChevronRight className="w-4 h-4" />
                </div>
            </button>
        );
    }

    // Editing View (Expanded Card)
    return (
        <div className="bg-white border border-zinc-200 rounded-2xl flex flex-col md:col-span-2 lg:col-span-2 row-span-2 shadow-xl ring-4 ring-zinc-50 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-zinc-900 rounded-t-2xl px-6 py-5 flex items-start justify-between relative overflow-hidden">
                <div className="flex gap-4 items-center relative z-10">
                    <div className="w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white text-zinc-900 leading-none">Editando</span>
                            <span className="text-[10px] text-zinc-400 font-mono tracking-wider">{product.id}</span>
                        </div>
                        <h3 className="text-2xl font-black text-white">{product.name}</h3>
                    </div>
                </div>
                <button
                    onClick={onStopEditing}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative z-10 mt-2"
                >
                    <X className="w-5 h-5" />
                </button>
                {/* Decorative background element */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-zinc-800/50 to-transparent pointer-events-none" />
            </div>

            <div className="p-6 flex flex-col h-full bg-zinc-50 rounded-b-2xl">
                <div className="flex-1 space-y-3">
                    {tempRecipe.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-2xl bg-white">
                            <ChefHat className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                            <h4 className="text-sm font-bold text-zinc-900 mb-1">Ficha Técnica Vazia</h4>
                            <p className="text-xs text-zinc-500 mb-4 max-w-xs mx-auto">Adicione os ingredientes para realizar a baixa automática de estoque.</p>
                            <button
                                onClick={() => setTempRecipe([{ ingredientId: '', amount: 0 }])}
                                className="bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm"
                            >
                                Adicionar Primeiro Ingrediente
                            </button>
                        </div>
                    )}

                    {tempRecipe.map((req, idx) => {
                        const selectedIng = inventoryItems.find(i => i.id === req.ingredientId);
                        return (
                            <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm relative group/item">
                                <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-500 shrink-0 hidden sm:flex">
                                    {idx + 1}
                                </div>

                                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 focus:border-zinc-400 focus:ring-0 outline-none"
                                            value={req.ingredientId}
                                            onChange={(e) => {
                                                const newR = [...tempRecipe];
                                                newR[idx].ingredientId = e.target.value;
                                                setTempRecipe(newR);
                                            }}
                                        >
                                            <option value="">Selecione um insumo...</option>
                                            {inventoryItems.map(i => (
                                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                            ))}
                                        </select>
                                        <AddIngredientDialog
                                            trigger={
                                                <button
                                                    title="Novo Insumo"
                                                    className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 justify-end w-full">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">Qtd:</span>
                                        <div className="relative w-28">
                                            <Input
                                                type="number"
                                                className="h-10 rounded-xl text-right pr-9 font-mono font-bold text-sm border-zinc-200 focus-visible:ring-0 focus-visible:border-zinc-400"
                                                value={req.amount || ''}
                                                onChange={(e) => {
                                                    const newR = [...tempRecipe];
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    newR[idx].amount = val;
                                                    setTempRecipe(newR);
                                                }}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                                                {selectedIng ? selectedIng.unit : '-'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setTempRecipe(tempRecipe.filter((_, i) => i !== idx))}
                                            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 pt-5 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button
                        onClick={() => setTempRecipe([...tempRecipe, { ingredientId: '', amount: 0 }])}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-dashed border-zinc-300 text-zinc-600 px-4 h-10 rounded-xl text-xs font-bold hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Ingrediente
                    </button>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={onStopEditing}
                            className="flex-1 sm:flex-none px-4 h-11 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onSave(product.id, tempRecipe)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 h-11 rounded-xl text-xs font-bold transition-colors active:scale-95 shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Ficha
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
