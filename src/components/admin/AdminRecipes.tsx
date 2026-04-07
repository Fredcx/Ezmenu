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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Fichas Técnicas</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Configure a composição exata dos seus pratos para um controle de estoque milimétrico.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex items-center bg-white rounded-xl border border-zinc-200 shadow-sm w-full md:w-72">
                        <Search className="ml-3 w-4 h-4 text-zinc-400" />
                        <Input
                            placeholder="Buscar produto ou receita..."
                            className="border-0 bg-transparent shadow-none focus-visible:ring-0 pl-2 h-11 text-sm placeholder:text-zinc-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <AddIngredientDialog
                        trigger={
                            <button className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 h-11 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap">
                                <Plus className="w-4 h-4" /> Novo Insumo
                            </button>
                        }
                    />
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
