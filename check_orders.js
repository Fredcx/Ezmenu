
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrdersColumns() {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in orders:', Object.keys(data[0]));
    } else {
        // If empty, try to get from rpc or just probe specific common names
        console.log('Table is empty. Probing common columns...');
        const common = ['status', 'payment_status', 'total_amount', 'customer_name', 'establishment_id'];
        for (const col of common) {
            const { error: colError } = await supabase.from('orders').select(col).limit(1);
            if (!colError) console.log(`Column exists: ${col}`);
        }
    }
}

checkOrdersColumns();
