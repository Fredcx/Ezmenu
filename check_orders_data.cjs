require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('orders')
    .select('table_id, status, establishment_id')
    .limit(5);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Sample Orders Data:", data);
}

check();
