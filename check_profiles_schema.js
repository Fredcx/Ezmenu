
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkProfilesSchema() {
    console.log("--- Inspecting Profiles Table ---");
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        const columns = data.length > 0 ? Object.keys(data[0]) : "No data to infer columns";
        console.log("Columns found in profiles table:", columns);
    }
}

checkProfilesSchema();
