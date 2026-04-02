const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPaymentsSchema() {
    console.log("Checking payments table columns via RPC/SQL...");
    
    // Attempting to use a common RPC if it exists, or just a raw query if enabled
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error accessing payments table:", error);
    } else {
        // If data is empty, we still don't know the columns from the object.
        // Let's try to insert a dummy record and rollback or just check if we can get metadata.
        console.log("Table exists. Data count check:", data.length);
    }
    
    // Better way: query information_schema.columns if we have permissions
    // But since we are using service_role, we might be able to use a custom RPC or just assume the code is correct if no errors.
    
    // Let's check for asaas_id specifically by trying to select it.
    const { data: asaasCheck, error: asaasError } = await supabase
        .from('payments')
        .select('asaas_id, pix_qr_code, status, order_id')
        .limit(0);
        
    if (asaasError) {
        console.error("Missing columns in payments table:", asaasError.message);
    } else {
        console.log("All required columns (asaas_id, pix_qr_code, status, order_id) are present in the payments table.");
    }
}

checkPaymentsSchema();
