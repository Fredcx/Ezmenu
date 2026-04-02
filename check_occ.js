import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkOcc() {
   const { data } = await supabase.from('restaurant_tables').select('id, occupants, status').eq('id', 'M1').eq('establishment_id', '8d98c2b8-c4e0-43c5-a2d4-413dd24ebd44').single();
   console.log("Table M1", data);
}
checkOcc();
