import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, ChefHat, Edit3, X } from 'lucide-react';
import { AddIngredientDialog } from './AddIngredientDialog';
import { InventoryItem, useInventory } from '@/contexts/InventoryContext';

interface RecipeCardProps {
    product: any; // Using any for now to match strict menuItem type if needed, or better define it
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
    const [isHovered, setIsHovered] = useState(false);

    // Sync tempRecipe when entering edit mode, or keep it synced?
    // Actually typically we want to reset it when opening edit mode.
    useEffect(() => {
        if (isEditing) {
            setTempRecipe(recipe);
        }
    }, [isEditing, recipe]);

    // Card Classes
    const cardBase = "relative group overflow-hidden rounded-2xl border transition-all duration-300";
    const cardStyle = isEditing
        ? "bg-background/95 backdrop-blur-xl border-primary ring-2 ring-primary/20 shadow-2xl scale-[1.02] z-10 md:col-span-2 lg:col-span-2 row-span-2"
        : "bg-card/40 hover:bg-card/80 border-border/50 hover:border-primary/30 shadow-sm hover:shadow-xl hover:-translate-y-1";

    if (!isEditing) {
        return (
            <div
                className={`${cardBase} ${cardStyle} flex flex-col`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Background Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="p-6 flex flex-col h-full relative z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0 shadow-inner ring-1 ring-border/50">
                                <img src={product.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${recipe.length > 0 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                                        {recipe.length > 0 ? `${recipe.length} Insumos` : 'Sem Ficha'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Preview of Ingredients */}
                    <div className="flex-1 space-y-2 mb-4">
                        {recipe.length > 0 ? (
                            <div className="space-y-1.5">
                                {recipe.slice(0, 3).map((req, idx) => {
                                    const ing = inventoryItems.find(i => i.id === req.ingredientId);
                                    return (
                                        <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-border/30 last:border-0 pl-2 border-l-2 border-l-primary/30">
                                            <span className="text-muted-foreground">{ing?.name}</span>
                                            <span className="font-mono font-medium text-foreground">{req.amount}{ing?.unit}</span>
                                        </div>
                                    )
                                })}
                                {recipe.length > 3 && (
                                    <div className="text-xs text-center text-muted-foreground pt-1 font-medium bg-secondary/30 rounded-lg py-1">
                                        +{recipe.length - 3} outros ingredientes
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-border/50 rounded-xl bg-secondary/10">
                                <ChefHat className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                <p className="text-sm text-muted-foreground">Nenhum ingrediente vinculado.</p>
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full group/btn relative overflow-hidden bg-secondary hover:bg-primary text-secondary-foreground hover:text-primary-foreground border-0 transition-all duration-300"
                        onClick={() => onStartEditing(product.id)}
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                        <span className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4" />
                            Editar Ficha Técnica
                        </span>
                    </Button>
                </div>
            </div>
        );
    }

    // Editing View (Expanded Card)
    return (
        <div
            className={`${cardBase} ${cardStyle} flex flex-col animate-in zoom-in-95 duration-200`}
        >
            <div className="absolute top-0 right-0 p-4 z-20">
                <Button size="icon" variant="ghost" className="rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={onStopEditing}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="p-8 flex flex-col h-full">
                <div className="flex gap-6 items-start mb-8 pb-6 border-b border-border/50">
                    <div className="w-24 h-24 rounded-2xl bg-secondary overflow-hidden shadow-lg ring-4 ring-background">
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground">Editando</span>
                            <span className="text-xs text-muted-foreground font-mono">ID: {product.id}</span>
                        </div>
                        <h3 className="text-3xl font-black">{product.name}</h3>
                        <p className="text-muted-foreground max-w-md">{product.description}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[400px]">
                    {tempRecipe.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-secondary/5">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                                <ChefHat className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h4 className="text-lg font-semibold">Lista Vazia</h4>
                            <p className="text-muted-foreground max-w-xs mx-auto mt-1 mb-4">Adicione os ingredientes que compõem este prato para controlar o estoque.</p>
                            <Button variant="outline" onClick={() => setTempRecipe([...tempRecipe, { ingredientId: '', amount: 0 }])}>
                                Começar Agora
                            </Button>
                        </div>
                    )}

                    {tempRecipe.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-secondary/30 p-4 rounded-xl border border-transparent hover:border-primary/30 transition-colors group/item">
                            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-xs font-bold text-muted-foreground border">
                                {idx + 1}
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Insumo</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-all focus:ring-2 focus:ring-primary"
                                            value={req.ingredientId}
                                            onChange={(e) => {
                                                const newR = [...tempRecipe];
                                                newR[idx].ingredientId = e.target.value;
                                                setTempRecipe(newR);
                                            }}
                                        >
                                            <option value="">Selecione...</option>
                                            {inventoryItems.map(i => (
                                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                            ))}
                                        </select>
                                        <AddIngredientDialog
                                            trigger={
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="shrink-0 h-10 w-10 border-dashed hover:border-primary hover:text-primary hover:bg-primary/5"
                                                    title="Novo Insumo"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="space-y-1 flex-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Qtd</label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                className="h-10 text-right pr-8 font-mono font-bold text-lg"
                                                value={req.amount || ''}
                                                onChange={(e) => {
                                                    const newR = [...tempRecipe];
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    newR[idx].amount = val;
                                                    setTempRecipe(newR);
                                                }}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                                {req.ingredientId ? inventoryItems.find(i => i.id === req.ingredientId)?.unit : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setTempRecipe(tempRecipe.filter((_, i) => i !== idx))}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-border flex justify-between items-center gap-4">
                    <Button variant="outline" className="border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5" onClick={() => setTempRecipe([...tempRecipe, { ingredientId: '', amount: 0 }])}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Item
                    </Button>

                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onStopEditing}>Cancelar</Button>
                        <Button
                            onClick={() => onSave(product.id, tempRecipe)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 min-w-[140px]"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Alterações
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
