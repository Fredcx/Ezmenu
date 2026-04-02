require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    // If no data, try to get column names from information_schema if possible, 
    // but easiest is to just insert a dummy or check RPC.
    // For now, let's just see if we have ANY rows.
    console.log("No rows found in payments table to check columns via select *.");
    
    // Fallback: try to select just a potentially new column
    const { error: extErr } = await supabase.from('payments').select('external_reference').limit(1);
    console.log("external_reference exists?", !extErr);
    
    const { error: estErr } = await supabase.from('payments').select('establishment_id').limit(1);
    console.log("establishment_id exists?", !estErr);
  }
}

check();
