import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { IngredientRequirement } from '@/data/recipes';

// Types
export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    minThreshold: number;
    category: string;
    dailyAverage?: number;
}

export type AvailabilityStatus = 'available' | 'low_stock' | 'out_of_stock';

interface InventoryContextType {
    inventoryItems: InventoryItem[];
    recipes: Record<string, IngredientRequirement[]>;
    consumptionHistory: { id: string, ingredientId: string, amount: number, date: string, type: 'deduction' }[];
    updateStock: (id: string, newQuantity: number) => void;
    addStock: (id: string, amountToAdd: number) => void;
    updateItem: (id: string, updates: Partial<InventoryItem>) => void;
    addIngredient: (item: InventoryItem) => void;
    updateRecipe: (productId: string, ingredients: IngredientRequirement[]) => void;
    deductStockForOrder: (menuItems: { idOrCode: string; quantity: number }[]) => Promise<void>;
    checkAvailability: (menuItemId: string) => AvailabilityStatus;
    getIngredient: (id: string) => InventoryItem | undefined;
    simulateHistory: () => void;
    isLoading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [recipes, setRecipes] = useState<Record<string, IngredientRequirement[]>>({});
    const [consumptionHistory, setConsumptionHistory] = useState<{ id: string, ingredientId: string, amount: number, date: string, type: 'deduction' }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);

    const loadInventoryData = async (estId: string) => {
        setIsLoading(true);
        try {
            // 1. Fetch Inventory
            const { data: invData, error: invError } = await supabase
                .from('inventory')
                .select('*')
                .eq('establishment_id', estId);

            if (invError) throw invError;
            if (invData) {
                setInventoryItems(invData.map(i => ({
                    id: i.id,
                    name: i.name,
                    quantity: Number(i.quantity),
                    unit: i.unit,
                    minThreshold: Number(i.min_threshold),
                    category: i.category,
                    dailyAverage: i.daily_average ? Number(i.daily_average) : undefined
                })));
            }

            // 2. Fetch Recipes
            const { data: recData, error: recError } = await supabase
                .from('recipes')
                .select(`
                    *,
                    menu_items (code),
                    inventory (id)
                `)
                .eq('establishment_id', estId);

            if (recError) throw recError;

            if (recData) {
                const groupedRecipes: Record<string, IngredientRequirement[]> = {};
                recData.forEach(r => {
                    const itemCode = r.menu_items?.code;
                    if (itemCode) {
                        if (!groupedRecipes[itemCode]) groupedRecipes[itemCode] = [];
                        groupedRecipes[itemCode].push({
                            ingredientId: r.ingredient_id,
                            amount: Number(r.amount)
                        });
                    }
                });
                setRecipes(groupedRecipes);
            }

            // 3. Fetch Consumption History
            const { data: consData, error: consError } = await supabase
                .from('consumption_history')
                .select('*')
                .eq('establishment_id', estId)
                .order('created_at', { ascending: false })
                .limit(1000);

            if (consError) throw consError;
            if (consData) {
                setConsumptionHistory(consData.map(c => ({
                    id: c.id,
                    ingredientId: c.ingredient_id,
                    amount: Number(c.amount),
                    date: c.created_at,
                    type: c.type as 'deduction'
                })));
            }
        } catch (error) {
            console.error("Failed to load inventory:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const detectEstablishment = async () => {
            const parts = window.location.pathname.split('/');
            const slug = parts[1];

            // If Admin or Superadmin, we need to find the establishment via the User Profile
            if (!slug || slug === 'admin' || slug === 'superadmin') {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('establishment_id')
                        .eq('id', user.id)
                        .single();

                    if (profile?.establishment_id) {
                        setEstablishmentId(profile.establishment_id);
                        loadInventoryData(profile.establishment_id);
                    } else {
                        setIsLoading(false);
                    }
                } else {
                    setIsLoading(false);
                }
                return;
            }

            // Normal flow for slug-based access (public/discovery)
            const { data } = await supabase
                .from('establishments')
                .select('id')
                .eq('slug', slug)
                .single();

            if (data) {
                setEstablishmentId(data.id);
                loadInventoryData(data.id);
            } else {
                setIsLoading(false);
            }
        };
        detectEstablishment();
    }, []);

    useEffect(() => {
        if (!establishmentId) return;

        const channels = [
            supabase.channel(`inv_${establishmentId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `establishment_id=eq.${establishmentId}` }, () => loadInventoryData(establishmentId)).subscribe(),
            supabase.channel(`rec_${establishmentId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter: `establishment_id=eq.${establishmentId}` }, () => loadInventoryData(establishmentId)).subscribe()
        ];

        return () => {
            channels.forEach(ch => supabase.removeChannel(ch));
        };
    }, [establishmentId]);

    // Actions
    const updateStock = async (id: string, newQuantity: number) => {
        try {
            const { error } = await supabase
                .from('inventory')
                .update({ quantity: Math.max(0, newQuantity) })
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error("Error updating stock:", error);
        }
    };

    const addStock = async (id: string, amountToAdd: number) => {
        try {
            const item = inventoryItems.find(i => i.id === id);
            if (!item) return;
            const { error } = await supabase
                .from('inventory')
                .update({ quantity: item.quantity + amountToAdd })
                .eq('id', id);
            if (error) throw error;
            toast.success('Estoque atualizado com sucesso!');
        } catch (error) {
            console.error("Error adding stock:", error);
        }
    };

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
            if (updates.unit) dbUpdates.unit = updates.unit;
            if (updates.minThreshold !== undefined) dbUpdates.min_threshold = updates.minThreshold;
            if (updates.category) dbUpdates.category = updates.category;
            if (updates.dailyAverage !== undefined) dbUpdates.daily_average = updates.dailyAverage;

            const { error } = await supabase
                .from('inventory')
                .update(dbUpdates)
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error("Error updating item:", error);
        }
    };

    const addIngredient = async (item: InventoryItem) => {
        if (!establishmentId) return;
        try {
            const { error } = await supabase.from('inventory').insert({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                min_threshold: item.minThreshold,
                category: item.category,
                daily_average: item.dailyAverage,
                establishment_id: establishmentId
            });
            if (error) throw error;
            toast.success('Novo insumo cadastrado!');
        } catch (error) {
            console.error("Error adding ingredient:", error);
        }
    };

    const updateRecipe = async (productCode: string, ingredients: IngredientRequirement[]) => {
        if (!establishmentId) return;
        try {
            const { data: itemData } = await supabase
                .from('menu_items')
                .select('id')
                .eq('code', productCode)
                .eq('establishment_id', establishmentId)
                .single();

            if (!itemData) return;

            await supabase.from('recipes').delete().eq('menu_item_id', itemData.id);

            const { error } = await supabase.from('recipes').insert(
                ingredients.map(ing => ({
                    menu_item_id: itemData.id,
                    ingredient_id: ing.ingredientId,
                    amount: ing.amount,
                    establishment_id: establishmentId
                }))
            );
            if (error) throw error;
            toast.success('Ficha técnica atualizada!');
        } catch (error) {
            console.error("Error updating recipe:", error);
        }
    };

    const deductStockForOrder = async (orderItems: { idOrCode: string; quantity: number }[]) => {
        if (!establishmentId) return;
        try {
            const deductionMap = new Map<string, number>();

            orderItems.forEach(item => {
                const recipe = recipes[item.idOrCode];
                if (recipe) {
                    recipe.forEach(ing => {
                        const currentNeeded = deductionMap.get(ing.ingredientId) || 0;
                        deductionMap.set(ing.ingredientId, currentNeeded + (ing.amount * item.quantity));
                    });
                }
            });

            if (deductionMap.size === 0) return;

            for (const [ingredientId, amount] of deductionMap.entries()) {
                const item = inventoryItems.find(i => i.id === ingredientId);
                if (item) {
                    await supabase
                        .from('inventory')
                        .update({ quantity: Math.max(0, item.quantity - amount) })
                        .eq('id', ingredientId);

                    await supabase.from('consumption_history').insert({
                        ingredient_id: ingredientId,
                        amount: amount,
                        type: 'deduction',
                        establishment_id: establishmentId
                    });
                }
            }
        } catch (error) {
            console.error("Error deducting stock:", error);
        }
    };

    const checkAvailability = (menuItemId: string): AvailabilityStatus => {
        const recipe = recipes[menuItemId];
        if (!recipe) return 'available';

        let status: AvailabilityStatus = 'available';

        for (const req of recipe) {
            const ingredient = inventoryItems.find(i => i.id === req.ingredientId);
            if (!ingredient) continue;

            if (ingredient.quantity < req.amount) {
                return 'out_of_stock';
            }

            if (ingredient.quantity <= ingredient.minThreshold) {
                status = 'low_stock';
            }
        }

        return status;
    };

    const getIngredient = (id: string) => inventoryItems.find(i => i.id === id);

    const simulateHistory = async () => {
        if (!establishmentId) return;
        const newLogs = [];
        const ingredients = inventoryItems.map(i => i.id);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 60);

        for (let d = 0; d < 60; d++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + d);
            const transactions = Math.floor(Math.random() * 6) + 3;

            for (let t = 0; t < transactions; t++) {
                const ingredientId = ingredients[Math.floor(Math.random() * ingredients.length)];
                if (!ingredientId) continue;
                const item = inventoryItems.find(i => i.id === ingredientId);
                if (!item) continue;

                let amount = 0;
                if (item.unit === 'g' || item.unit === 'ml') amount = Math.floor(Math.random() * 500) + 50;
                else amount = Math.floor(Math.random() * 5) + 1;

                newLogs.push({
                    ingredient_id: ingredientId,
                    amount,
                    created_at: date.toISOString(),
                    type: 'deduction',
                    establishment_id: establishmentId
                });
            }
        }

        const { error } = await supabase.from('consumption_history').insert(newLogs);
        if (error) console.error("History simulation error:", error);
        else toast.success('Dados simulados gerados com sucesso!');
    };

    return (
        <InventoryContext.Provider value={{
            inventoryItems,
            recipes,
            consumptionHistory,
            updateStock,
            addStock,
            updateItem,
            addIngredient,
            updateRecipe,
            deductStockForOrder,
            checkAvailability,
            getIngredient,
            simulateHistory,
            isLoading
        }}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return context;
};
