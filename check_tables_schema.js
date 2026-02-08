
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTablesSchema() {
    console.log("--- Inspecting Restaurant Tables ---");
    const { data, error } = await supabase.from('restaurant_tables').select('*').limit(1);
    if (error) console.error("Error fetching tables:", error);
    else console.log("Columns in restaurant_tables:", data.length > 0 ? Object.keys(data[0]) : "No rows");
}

checkTablesSchema();
