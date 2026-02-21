
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    const tables = ['establishments', 'categories', 'menu_items'];
    for (const table of tables) {
        console.log(`\nChecking ${table} columns...`);
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                console.error(`Error ${table}:`, error.message);
            } else if (data && data.length > 0) {
                console.log(`${table} sample:`, data[0]);
                console.log(`Columns available in ${table}:`, Object.keys(data[0]));
            } else {
                console.log(`Table ${table} is empty or not found.`);
            }
        } catch (e) {
            console.error(`Exception checking ${table}:`, e.message);
        }
    }
}

check();
