import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSystemItems() {
    const { data: est } = await supabase.from('establishments').select('id').eq('slug', 'art-of-sushi').single();
    if(est) {
       const { data: items } = await supabase.from('menu_items')
         .select('id, name, code')
         .eq('establishment_id', est.id)
         .in('code', ['SYS01', 'SYS02']);
       console.log("System Items:", items);
    }
}
checkSystemItems();
