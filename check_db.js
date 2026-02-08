import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEstablishmentAndProfiles() {
    console.log("Checking establishments...");
    const { data: ests, error: estErr } = await supabase.from('establishments').select('id, name, slug');
    if (estErr) console.error("Est error:", estErr);
    else console.log("Establishments found:", ests);

    console.log("\nChecking profile for admin@ezmenu.com...");
    const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, role, establishment_id')
        .eq('email', 'admin@ezmenu.com');

    if (profErr) console.error("Profile error:", profErr);
    else console.log("Profiles found:", profiles);
}

checkEstablishmentAndProfiles();
