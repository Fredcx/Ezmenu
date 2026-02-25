
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase
        .from('establishments')
        .select('id')
        .limit(1);

    if (error) {
        console.error('Error connecting to Supabase:', error);
        return;
    }

    console.log('Successfully connected to Supabase.');

    const tablesToProbe = ['payments', 'orders', 'order_items', 'establishments', 'profiles', 'categories', 'menu_items', 'restaurant_tables'];

    for (const table of tablesToProbe) {
        const { error: probeError } = await supabase.from(table).select('*').limit(1);
        if (!probeError) {
            console.log(`Table exists: ${table}`);
        } else if (probeError.code === 'PGRST116') {
            console.log(`Table exists: ${table} (Empty)`);
        } else if (probeError.code === '42P01') {
            console.log(`Table does NOT exist: ${table}`);
        } else {
            console.log(`Table probably exists or error: ${table} (${probeError.code} - ${probeError.message})`);
        }
    }
}

listTables();
