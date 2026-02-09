import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("Establishment Lookup:");
    const { data: ests } = await supabase.from('establishments').select('id, name, slug');
    console.log(JSON.stringify(ests, null, 2));

    console.log("\nTables Data:");
    const { data: tables, error } = await supabase.from('restaurant_tables').select('*');
    if (error) {
        console.error("Error fetching tables:", error);
    } else {
        console.log(JSON.stringify(tables, null, 2));
    }
}

check();
