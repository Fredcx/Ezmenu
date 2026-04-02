
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking profiles...");
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Profiles found:", profiles);
    }
}

check();
