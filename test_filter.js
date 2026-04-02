import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectTable() {
    console.log("Fetching orders for table: M1 directly (NO FILTER) to see what exists");
    const { data: all } = await supabase.from('orders').select('id, status').eq('table_id', 'M1');
    console.log("All orders M1:", all);

    console.log("\nAttempt 1: .neq repeatedly");
    const { data: d1 } = await supabase.from('orders').select('id, status').eq('table_id', 'M1')
        .neq('status', 'completed').neq('status', 'paid').neq('status', 'archived').neq('status', 'cancelled');
    console.log("d1 length:", d1?.length);

    console.log("\nAttempt 2: .not('status', 'in', '(completed,paid,archived,cancelled)')");
    const { data: d2, error: e2 } = await supabase.from('orders').select('id, status').eq('table_id', 'M1')
        .not('status', 'in', '(completed,paid,archived,cancelled)');
    console.log("d2 length:", d2?.length, "error:", e2?.message);

    console.log("\nAttempt 3: .filter('status', 'not.in', '(completed,paid,archived,cancelled)')");
    const { data: d3, error: e3 } = await supabase.from('orders').select('id, status').eq('table_id', 'M1')
        .filter('status', 'not.in', '(completed,paid,archived,cancelled)');
    console.log("d3 length:", d3?.length, "error:", e3?.message);
}

inspectTable();
