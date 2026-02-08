
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function discover() {
    console.log("--- Discovering order_items columns ---");
    const columns = [
        'menu_item_id', 'menu_item', 'item_id', 'product_id', 'menu_items_id', 'id_menu_item', 'id_item',
        'quantity', 'price', 'price_at_order',
        'order_id', 'id_order', 'order',
        'status', 'observation', 'notes', 'comment'
    ];

    const results = [];
    for (const col of columns) {
        const { error } = await supabase.from('order_items').select(col).limit(1);
        if (!error) {
            results.push(col);
        }
    }

    if (results.length > 0) {
        console.log("Columns that EXIST in order_items:", results);
    } else {
        console.log("None of the guessed columns exist.");
    }

    console.log("\n--- Probing for any row ---");
    const { data: allData } = await supabase.from('order_items').select('*').limit(1);
    if (allData && allData.length > 0) {
        console.log("Actual keys in a row:", Object.keys(allData[0]));
    } else {
        console.log("Table is empty. Probing via insert to find required columns...");
        const { error: insertError } = await supabase.from('order_items').insert({}).select().single();
        console.log("Insertion error response:", insertError?.message || "No error (?!?)");
        console.log("Full error object:", JSON.stringify(insertError, null, 2));
    }
}

discover();
