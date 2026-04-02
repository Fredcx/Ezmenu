import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log("Checking columns for restaurant_tables...");
    const { data, error } = await supabase.from('restaurant_tables').select('*').limit(1);

    if (error) {
        console.error("Error fetching table:", error);
    } else {
        console.log("Sample record or columns found:", data[0] ? Object.keys(data[0]) : "No records found");
    }

    // Try to get column info from information_schema if possible (might not work via anon key)
    const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'restaurant_tables' });
    if (colErr) console.log("RPC get_table_columns not available (expected)");
    else console.log("Columns via RPC:", cols);
}

checkSchema();
