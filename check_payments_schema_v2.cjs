const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPaymentsSchema() {
    console.log("Checking payments table schema...");
    try {
        const { data: cols, error: err } = await supabase.from('payments').select('*').limit(1);
        if (err) {
            console.error("Error fetching payments table:", err);
            process.exit(1);
        } else {
            console.log("Columns found in payments table:", Object.keys(cols[0] || {}));
            process.exit(0);
        }
    } catch (e) {
        console.error("Unexpected error:", e);
        process.exit(1);
    }
}

checkPaymentsSchema();
