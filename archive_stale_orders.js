
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://tskdxczlahkhkoqcxann.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRza2R4Y3psYWhraGtvcWN4YW5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyNzU5NCwiZXhwIjoyMDg1MzAzNTk0fQ.uGsmMVJ1UiwIO9hRSo4I7xu3tYWjfmYHKjYtgnq2fYs');

async function archiveStaleOrders() {
    console.log('Archiving stale orders (V2)...');
    const { data: est, error: estError } = await supabase.from('establishments').select('id').eq('slug', 'art-of-sushi').single();
    if (estError) throw estError;

    // Find orders from Feb 11 that are not cancelled/completed/archived
    const staleDate = '2026-02-12T00:00:00Z';
    const { data: orders, error: findError } = await supabase
        .from('orders')
        .select('id')
        .eq('establishment_id', est.id)
        .lt('created_at', staleDate)
        .filter('status', 'not.in', '("cancelled","archived","completed")');

    if (findError) throw findError;
    console.log(`Found ${orders.length} stale orders to archive.`);

    if (orders.length > 0) {
        const { error: updateError } = await supabase
            .from('orders')
            .update({ status: 'archived' })
            .in('id', orders.map(o => o.id));
        if (updateError) throw updateError;
        console.log('Successfully archived stale orders.');
    }
}

archiveStaleOrders().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
