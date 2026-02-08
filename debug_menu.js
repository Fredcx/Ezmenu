
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

async function checkMenu() {
    const { data: items, error } = await supabase
        .from('menu_items')
        .select('*, categories(name)');

    if (error) {
        console.error('Error fetching items:', error);
        return;
    }

    console.log(`Total items in DB: ${items?.length}`);

    const categorySummary = {};
    items?.forEach(item => {
        const catName = item.categories?.name || 'No Category';
        categorySummary[catName] = (categorySummary[catName] || 0) + 1;
    });

    console.log('Category breakdown:');
    console.log(JSON.stringify(categorySummary, null, 2));
}

checkMenu();
