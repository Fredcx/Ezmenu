const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColTypes() {
    console.log("Checking payments table columns details...");
    // We can't easily get types via JS client without RPC, but we can try to insert a string and see if it fails
    // Or we can try to select it and check if it looks like a UUID
    
    const { data, error } = await supabase.from('payments').select('order_id').limit(1);
    if (error) {
        console.error("Error naming columns:", error);
    } else {
        console.log("Sample order_id from payments:", data[0]?.order_id);
    }
}

checkColTypes();
