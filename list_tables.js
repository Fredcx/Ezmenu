
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listTables() {
    console.log('--- Listing Tables ---');

    const commonTables = [
        'restaurant_tables',
        'menu_items',
        'menu_categories',
        'orders',
        'order_items',
        'profiles',
        'categories',
        'items',
        'service_requests',
        'establishments'
    ];

    for (const table of commonTables) {
        const { data: tableData, error: tableError } = await supabase.from(table).select('*').limit(1);
        if (tableError) {
            console.log(`❌ Table ${table} does NOT exist (or error: ${tableError.message})`);
        } else {
            console.log(`✅ Table ${table} EXISTS`);
        }
    }
}

listTables();
