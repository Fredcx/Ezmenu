const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPaymentsSchema() {
    console.log("Checking payments table schema...");
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'payments' });
    
    // If RPC doesn't exist, try a simple query to see columns
    if (error) {
        console.log("RPC get_table_columns failed, trying select * limit 0...");
        const { data: cols, error: err } = await supabase.from('payments').select('*').limit(0);
        if (err) {
            console.error("Error fetching payments table:", err);
        } else {
            console.log("Columns found in payments table:", Object.keys(cols[0] || {}));
        }
    } else {
        console.log("Columns:", data);
    }
}

checkPaymentsSchema();
