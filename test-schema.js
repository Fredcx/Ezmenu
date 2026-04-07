import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
    const { data: cols, error: err } = await supabase.rpc('get_table_columns_simple', { param: 'orders' }).catch(() => ({ error: 'rpc failed' }));
    if (!err && cols) {
        console.log("Columns from RPC:", cols);
    } else {
        // Just fetch one row
        const { data } = await supabase.from('orders').select('*').limit(1);
        if (data && data.length > 0) {
            console.log("Columns inferred from data:", Object.keys(data[0]));
        } else {
             // Create a dummy record and rollback... actually let's just insert one fake and delete it
             const { data: test, error: tErr } = await supabase.from('orders').insert({
                 table_id: 'test', establishment_id: '123'
             }).select().single();
             if (test) {
                 console.log("Columns:", Object.keys(test));
                 await supabase.from('orders').delete().eq('id', test.id);
             } else {
                 console.log("Insert failed, maybe RLS", tErr);
             }
        }
    }
}
main();
