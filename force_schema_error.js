
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function forceError() {
    console.log("--- Forcing Schema Error on Profiles ---");
    // Selecting a non-existent column to force the error message with available columns
    const { error } = await supabase.from('profiles').select('non_existent_column').limit(1);
    if (error) {
        console.log("Forced Error Message:", error.message);
        console.log("Detailed Error:", error);
    }
}

forceError();
