
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://tskdxczlahkhkoqcxann.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRza2R4Y3psYWhraGtvcWN4YW5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyNzU5NCwiZXhwIjoyMDg1MzAzNTk0fQ.uGsmMVJ1UiwIO9hRSo4I7xu3tYWjfmYHKjYtgnq2fYs');

async function debug() {
    console.log('Starting debug (ESM)...');
    const { data: est, error: estError } = await supabase.from('establishments').select('id').eq('slug', 'art-of-sushi').single();
    if (estError) { console.error('Est Error:', estError); return; }
    console.log('Found Est:', est.id);

    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, table_id, created_at')
        .eq('establishment_id', est.id)
        .not('status', 'in', '("cancelled", "archived", "completed")');

    if (ordersError) { console.error('Orders Error:', ordersError); return; }
    console.log('Active Orders count:', orders.length);
    console.log('Orders Detail:', JSON.stringify(orders, null, 2));
}

debug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
