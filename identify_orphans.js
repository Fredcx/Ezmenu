
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function identify() {
    const { data: items } = await supabase.from('menu_items').select('*');

    const orphans = items?.filter(i => i.category_id === null);

    console.log(`Total Orphans: ${orphans?.length}`);
    console.table(orphans?.map(o => ({ code: o.code, name: o.name, is_rodizio: o.is_rodizio })));
}

identify();
