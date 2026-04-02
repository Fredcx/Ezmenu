import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    console.log("Fetching orders for table: M1");
    // Fetch directly what CartView / OrderContext fetches
    const { data: activeOrders, error: fetchError } = await supabase
        .from('orders')
        .select(`
            id,
            status,
            customer_name,
            table_id,
            created_at,
            order_items (
            id,
            status,
            quantity
            )
        `)
        .eq('table_id', 'M1')
        .not('status', 'in', '("completed","paid","archived","cancelled")'); // Test the string syntax
        
    const { data: activeOrdersArraySyntax, error: fetchError2 } = await supabase
        .from('orders')
        .select(`
            id,
            status,
            customer_name,
            table_id,
            created_at,
            order_items (
            id,
            status,
            quantity
            )
        `)
        .eq('table_id', 'M1')
        .not('status', 'in', ['completed', 'paid', 'archived', 'cancelled']); // Test the array syntax

    if (fetchError) console.error("Error 1:", fetchError);
    if (fetchError2) console.error("Error 2:", fetchError2);

    console.log("--- String Syntax Results ---");
    console.log(JSON.stringify(activeOrders, null, 2));

    console.log("--- Array Syntax Results ---");
    console.log(JSON.stringify(activeOrdersArraySyntax, null, 2));
}

inspectTable();
