
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log("--- Inspecting Profiles Table ---");
    const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
    if (pError) console.error("Error fetching profiles:", pError);
    else console.log("Columns in profiles:", pData.length > 0 ? Object.keys(pData[0]) : "No rows");

    console.log("\n--- Inspecting Establishments Table ---");
    const { data: eData, error: eError } = await supabase.from('establishments').select('*').limit(1);
    if (eError) console.error("Error fetching establishments:", eError);
    else console.log("Columns in establishments:", eData.length > 0 ? Object.keys(eData[0]) : "No rows");
}

checkSchema();
