import { useState } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { useMenu } from '@/contexts/MenuContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, ChefHat, Search, Edit3, X, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AddIngredientDialog } from './AddIngredientDialog';
import { RecipeCard } from './RecipeCard';

export function AdminRecipes() {
    const { inventoryItems, recipes, updateRecipe } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { items } = useMenu();


    // Safety check for context data
    const safeItems = Array.isArray(items) ? items : [];

    const allProducts = safeItems.filter(item => {
        if (!item || !item.category) return false;
        return !['bebidas', 'drinks', 'vinhos', 'tacas'].includes(item.category);
    });

    const filteredProducts = allProducts.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveRecipe = (productId: string, ingredients: any[]) => {
        updateRecipe(productId, ingredients);
        setSelectedProduct(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-border/40">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20 mb-2">
                        <Sparkles className="w-3 h-3" />
                        Área de Criação
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        Fichas Técnicas
                        <span className="text-muted-foreground font-light text-2xl">| Receitas</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl font-light">
                        Configure a composição exata dos seus pratos para um controle de estoque milimétrico.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-end">
                    <AddIngredientDialog
                        trigger={
                            <Button variant="outline" className="gap-2 h-12 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5">
                                <Plus className="w-4 h-4" /> Criar Insumo Rápido
                            </Button>
                        }
                    />
                    <div className="relative group w-full md:w-auto">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-orange-600/50 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                        <div className="relative flex items-center bg-background rounded-lg border border-border group-hover:border-primary/50 transition-colors">
                            <Search className="ml-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Buscar produto ou receita..."
                                className="border-0 bg-transparent focus-visible:ring-0 pl-3 w-full md:w-[280px] h-12 text-base"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1'}`}>
                {filteredProducts.map(product => (
                    <RecipeCard
                        key={product.id}
                        product={product}
                        recipe={recipes[product.id] || []}
                        isEditing={selectedProduct === product.id}
                        onStartEditing={setSelectedProduct}
                        onStopEditing={() => setSelectedProduct(null)}
                        onSave={handleSaveRecipe}
                    />
                ))}
            </div>
        </div>
    );
}
