import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkConfig() {
    const { data } = await supabase.from('establishments').select('slug, restaurant_type');
    console.log("Establishments:", data);
}

checkConfig();
