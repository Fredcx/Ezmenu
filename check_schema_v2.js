
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTable(tableName) {
    console.log(`\nChecking table: ${tableName}`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Columns for ${tableName}:`, Object.keys(data[0]));
    } else {
        // If no data, try to get columns via a dummy insert or just report empty
        console.log(`No data in ${tableName} to infer columns.`);
    }
}

async function run() {
    await checkTable('orders');
    await checkTable('order_items');
    await checkTable('service_requests');
    await checkTable('menu_items');
    await checkTable('establishments');
}

run();
