
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function checkConstraints() {
    console.log("--- Checking Constraints on profiles ---");
    try {
        // Querying informational schema via REST might be limited, but we can try to fetch table definition if we have a direct SQL access or just try an insert.
        // Actually, let's try to query information_schema via a dummy RPC or just a direct SQL-like structure if allowed, 
        // but since we only have REST, we'll try to find if email is unique by trying to insert a duplicate if it exists.

        // Better: Use the OpenAPI spec again to see if 'email' has 'unique' property if it's there.
        const specResponse = await fetch(`${url}/rest/v1/`, {
            headers: { 'apikey': key }
        });
        const spec = await specResponse.json();
        const profiles = spec.definitions?.profiles;
        if (profiles) {
            console.log("Profiles properties:", JSON.stringify(profiles.properties, null, 2));
        }
    } catch (e) {
        console.error("Failed to check constraints:", e);
    }
}

checkConstraints();
