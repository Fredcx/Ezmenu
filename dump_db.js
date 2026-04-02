
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function dump() {
    console.log("--- Categories ---");
    const { data: cats } = await supabase.from('categories').select('*');
    console.table(cats?.map(c => ({ id: c.id, name: c.name, type: c.type })));

    console.log("\n--- Menu Items Summary ---");
    const { data: items } = await supabase.from('menu_items').select('*, categories(name)');

    const summary = {};
    items?.forEach(i => {
        const catName = i.categories?.name || 'No Category';
        summary[catName] = (summary[catName] || 0) + 1;
    });
    console.table(Object.entries(summary).map(([name, count]) => ({ Category: name, Items: count })));

    console.log("\n--- Items for mentioned categories ---");
    const targets = ['Combinados', 'Quentes', 'Veggies', "Roll's", 'Temaki', 'Joy', 'Duplas', 'Carros-Chefe', 'Bebidas'];
    const filtered = items?.filter(i => targets.includes(i.categories?.name));
    console.table(filtered?.map(i => ({ code: i.code, name: i.name, category: i.categories?.name, rodizio: i.is_rodizio })));
}

dump();
