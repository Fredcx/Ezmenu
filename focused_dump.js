
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function dump() {
    const targets = ['Combinados', 'Quentes', 'Veggies', "Roll's", 'Temaki', 'Joy', 'Duplas', 'Carros-Chefe', 'Bebidas', "Hot's", 'Pratos quentes'];

    const { data: items } = await supabase
        .from('menu_items')
        .select('*, categories!inner(name, type)')
        .in('categories.name', targets);

    console.log("--- Focused Items Report ---");
    const report = items?.map(i => ({
        code: i.code,
        name: i.name,
        is_rodizio: i.is_rodizio,
        cat_name: i.categories?.name,
        cat_type: i.categories?.type,
        image: i.image_url ? 'YES' : 'NO'
    }));
    console.table(report);
}

dump();
