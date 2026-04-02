import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function forceCleanup() {
    console.log("Cleaning up orders for B4...");
    const { error: ordErr } = await supabase.from('orders').delete().eq('table_id', 'B4');
    if (ordErr) console.error("Error deleting orders:", ordErr);
    else console.log("Orders for B4 deleted.");

    console.log("Attempting to delete B4 again...");
    const { error: estErr } = await supabase.from('restaurant_tables').delete().eq('id', 'B4');

    if (estErr) console.error("Error deleting B4:", estErr);
    else console.log("B4 deleted successfully.");
}

forceCleanup();
