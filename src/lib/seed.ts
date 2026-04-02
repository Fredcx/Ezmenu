import { supabase } from './supabase';
import { menuItems, categories as rodizioCats, alacarteCategories as alacarteCats } from '@/data/menuData';
import { INITIAL_INVENTORY, RECIPES } from '@/data/recipes';

// Simplified Table Data from AdminTables.tsx
const DEFAULT_TABLES = [
    { id: 'B1', shape: 'rect', top: '10%', left: '10%', w: '85px', h: '55px', seats: 4 },
    { id: 'B2', shape: 'square', top: '10%', left: '40%', w: '60px', h: '60px', seats: 2 },
    { id: 'B3', shape: 'rect', top: '10%', left: '70%', w: '100px', h: '55px', seats: 6 },
    { id: 'B5', shape: 'rect', top: '70%', left: '10%', w: '85px', h: '55px', seats: 4 },
    { id: 'B6', shape: 'long', top: '70%', left: '60%', w: '140px', h: '55px', seats: 8 },
];

export async function seedDatabase() {
    console.log('Starting seed...');

    try {
        // 1. Categories
        const allCats = [
            ...rodizioCats.map(c => ({ name: c.name, icon: c.icon, type: 'rodizio' })),
            ...alacarteCats.map(c => ({ name: c.name, icon: c.icon, type: 'alacarte' }))
        ];

        console.log('Seeding categories...');
        const { data: catData, error: catError } = await supabase.from('categories').upsert(
            allCats,
            { onConflict: 'name, type' }
        ).select();

        if (catError) throw catError;

        const catMap = new Map();
        catData?.forEach(c => {
            const key = `${c.name}|${c.type}`;
            catMap.set(key, c.id);
        });

        // 2. Menu Items
        console.log('Seeding menu items...');
        const itemsToInsert = menuItems.map(item => {
            // Find category ID
            const origCat = rodizioCats.find(c => c.id === item.category) || alacarteCats.find(c => c.id === item.category);
            const catId = origCat ? catMap.get(`${origCat.name}|${item.isRodizio ? 'rodizio' : 'alacarte'}`) : null;

            return {
                code: item.code,
                name: item.name,
                description: item.description,
                price: item.price,
                category_id: catId,
                image_url: item.image,
                is_rodizio: item.isRodizio,
                station: item.station,
                allergens: item.allergens,
                tags: item.tags
            };
        });

        const { data: itemData, error: itemError } = await supabase.from('menu_items').upsert(
            itemsToInsert,
            { onConflict: 'code' }
        ).select();

        if (itemError) throw itemError;

        const itemMap = new Map();
        itemData?.forEach(i => itemMap.set(i.code, i.id));

        // 3. Inventory
        console.log('Seeding inventory...');
        const inventoryToInsert = INITIAL_INVENTORY.map(inv => ({
            name: inv.name,
            quantity: inv.quantity,
            unit: inv.unit,
            min_threshold: inv.minThreshold,
            category: inv.category
        }));

        const { data: invData, error: invError } = await supabase.from('inventory').upsert(
            inventoryToInsert,
            { onConflict: 'name' }
        ).select();

        if (invError) throw invError;

        const invMap = new Map();
        invData?.forEach(i => invMap.set(i.name, i.id));

        // 4. Recipes
        console.log('Seeding recipes...');
        const recipesToInsert = [];
        for (const [itemCodeOrId, ingredients] of Object.entries(RECIPES)) {
            const menuItem = menuItems.find(m => m.id === itemCodeOrId || m.code === itemCodeOrId);
            if (!menuItem) continue;

            const supabaseItemId = itemMap.get(menuItem.code);
            if (!supabaseItemId) continue;

            for (const ing of ingredients) {
                const origInv = INITIAL_INVENTORY.find(i => i.id === ing.ingredientId);
                if (!origInv) continue;

                const supabaseInvId = invMap.get(origInv.name);
                if (!supabaseInvId) continue;

                recipesToInsert.push({
                    menu_item_id: supabaseItemId,
                    ingredient_id: supabaseInvId,
                    amount: ing.amount
                });
            }
        }

        if (recipesToInsert.length > 0) {
            const { error: recipeError } = await supabase.from('recipes').upsert(recipesToInsert);
            if (recipeError) throw recipeError;
        }

        // 5. Tables
        console.log('Seeding tables...');
        const tablesToInsert = DEFAULT_TABLES.map(t => ({
            id: t.id,
            shape: t.shape,
            top_pos: t.top,
            left_pos: t.left,
            width: t.w,
            height: t.h,
            seats: t.seats
        }));

        const { error: tableError } = await supabase.from('restaurant_tables').upsert(
            tablesToInsert,
            { onConflict: 'id' }
        );
        if (tableError) throw tableError;

        console.log('Seed completed successfully!');
        return true;
    } catch (error: any) {
        console.error('Migration error:', error.message || error);
        throw error;
    }
}
