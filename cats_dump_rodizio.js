
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function dump() {
    const { data: cats } = await supabase.from('categories').select('*').eq('type', 'rodizio');
    console.log("--- Rodizio Categories ---");
    console.table(cats?.map(c => ({ id: c.id, name: c.name })));
}

dump();
