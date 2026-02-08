
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { categories as localRodizioCats, alacarteCategories as localAlacarteCats } from './src/data/menuData.ts';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function simulate() {
    const { data: itemData } = await supabase.from('menu_items').select('*, categories(name)');

    const formattedItems = itemData?.map(item => {
        const categoryName = item.categories?.name;
        const localCat = [...localRodizioCats, ...localAlacarteCats].find(c => c.name === categoryName);

        return {
            code: item.code,
            name: item.name,
            db_cat_name: categoryName,
            mapped_cat_id: localCat ? localCat.id : (categoryName || ''),
            is_rodizio: item.is_rodizio
        };
    });

    console.log("--- Items Mapping Report ---");
    console.table(formattedItems);
}

simulate();
