
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function dump() {
    const { data: items } = await supabase.from('menu_items').select('*, categories(name, type)');

    console.log("--- Items with Category Names ---");
    const report = items?.map(i => ({
        code: i.code,
        name: i.name,
        is_rodizio: i.is_rodizio,
        cat_name: i.categories?.name,
        cat_type: i.categories?.type
    }));
    console.table(report);
}

dump();
