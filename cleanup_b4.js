import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupB4() {
    console.log("Checking current tables...");
    const { data: tables } = await supabase.from('restaurant_tables').select('id');
    console.log("Tables in DB:", tables?.map(t => t.id));

    console.log("Attempting to delete B4...");
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', 'B4');

    if (error) console.error("Error deleting B4:", error);
    else console.log("B4 delete command sent successfully.");

    const { data: after } = await supabase.from('restaurant_tables').select('id').eq('id', 'B4');
    console.log("B4 search after delete:", after);
}

cleanupB4();
