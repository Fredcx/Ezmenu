const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrdersSchema() {
    console.log("Checking orders table columns...");
    const { data: cols, error: err } = await supabase.from('orders').select('*').limit(1);
    if (err) {
        console.error("Error fetching orders table:", err);
    } else {
        console.log("Columns in orders table:", Object.keys(cols[0] || {}));
    }
}

checkOrdersSchema();
