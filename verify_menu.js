
import { createClient } from '@supabase/supabase-js';
import pkg from 'dotenv';
const { config } = pkg;
import path from 'path';
import process from 'process';

config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyMenu() {
    // 1. Fetch all categories
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*');

    if (catError) {
        console.error('Error fetching categories:', catError);
        return;
    }

    // 2. Fetch all menu items
    const { data: items, error: itemError } = await supabase
        .from('menu_items')
        .select('*');

    if (itemError) {
        console.error('Error fetching items:', itemError);
        return;
    }

    console.log(`Total Categories: ${categories.length}`);
    console.log(`Total Items: ${items.length}`);

    const report = categories.map(cat => {
        const catItems = items.filter(item => item.category_id === cat.id);
        return {
            name: cat.name,
            type: cat.type,
            itemCount: catItems.length
        };
    });

    console.log('Category Verification Report:');
    console.log(JSON.stringify(report, null, 2));
}

verifyMenu();
