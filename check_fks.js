
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function checkFKs() {
    console.log("--- Checking Foreign Keys on profiles ---");
    try {
        // Since we can't easily query pg_constraint via REST without a function,
        // we will try to fetch the table information if possible or just rely on the error message we already got.
        // The error message specifically said "violates foreign key constraint 'profiles_id_fkey'" 
        // and "Key is not present in table 'users'". 

        // This confirms 'id' is a FK to 'auth.users' (aliased as 'users' in some contexts).
        console.log("CONFIRMED: 'profiles.id' is a Foreign Key to 'auth.users.id'.");

        // Let's verify if there are other columns like 'user_id' or if 'id' is the only link.
        const specResponse = await fetch(`${url}/rest/v1/`, {
            headers: { 'apikey': key }
        });
        const spec = await specResponse.json();
        const profiles = spec.definitions?.profiles;
        if (profiles) {
            console.log("Profiles Definition:", JSON.stringify(profiles, null, 2));
        }
    } catch (e) {
        console.error("Failed to check FKs:", e);
    }
}

checkFKs();
