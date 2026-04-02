import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkMenu() {
    const { data: est } = await supabase.from('establishments').select('id').eq('slug', 'art-of-sushi').single();
    if(est) {
       const { data: items } = await supabase.from('menu_items').select('id, name, price, is_rodizio').eq('establishment_id', est.id).limit(10);
       console.log(items);
    }
}
checkMenu();
