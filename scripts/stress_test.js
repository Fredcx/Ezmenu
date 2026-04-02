import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runTest() {
  console.log("Fetching first inventory item...");
  const { data: items } = await supabase.from('inventory').select('*').limit(1);
  if (!items || items.length === 0) {
    console.log("No inventory items found to test!");
    return;
  }
  
  const testItem = items[0];
  console.log(`Setting starting quantity of ${testItem.name} to 100...`);
  await supabase.from('inventory').update({ quantity: 100 }).eq('id', testItem.id);

  console.log(`Simulating 20 parallel cooks deducting 5 items at the exact same millisecond...`);
  
  const quantityToDeduct = 5;
  const targetQuantity = 100 - (20 * 5); // Should be 0
  
  // They all read '100' because they read before writing in the current architecture
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push((async () => {
        // Simulating the exact code in InventoryContext:
        // const item = inventoryItems.find(...) // which was 100 at time of render
        // await supabase.update({ quantity: Math.max(0, item.quantity - amount) })
        const { error } = await supabase
            .from('inventory')
            .update({ quantity: Math.max(0, 100 - quantityToDeduct) }) // Client sends 95
            .eq('id', testItem.id);
        if(error) console.error(error);
    })());
  }

  await Promise.all(promises);

  const { data: finalItem } = await supabase.from('inventory').select('*').eq('id', testItem.id).single();
  
  console.log(`\n========= STRESS TEST RESULTS =========`);
  console.log(`Expected Quantity: ${targetQuantity}`);
  console.log(`Actual Quantity in DB: ${finalItem.quantity}`);
  
  if (finalItem.quantity !== targetQuantity) {
    console.log(`[FAILED] The Read-Modify-Write race condition caused stock to be ${finalItem.quantity} instead of ${targetQuantity}! Data was lost.`);
  } else {
    console.log(`[PASSED] No data lost.`);
  }
}

runTest();
