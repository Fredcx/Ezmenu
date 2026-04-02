
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function inspect() {
    console.log("--- Inspecting Profiles Table via REST (Native Fetch) ---");
    try {
        const response = await fetch(`${url}/rest/v1/profiles?limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Fetch error:", error);
        } else {
            const data = await response.json();
            if (data.length > 0) {
                console.log("Columns found:", Object.keys(data[0]));
            } else {
                console.log("Table is empty. Trying to fetch OpenAPI spec...");
                const specResponse = await fetch(`${url}/rest/v1/`, {
                    headers: { 'apikey': key }
                });
                const spec = await specResponse.json();
                const profileDef = spec.definitions?.profiles;
                if (profileDef) {
                    console.log("Profile definition columns:", Object.keys(profileDef.properties));
                } else {
                    console.log("Could not find profiles definition in spec.");
                }
            }
        }
    } catch (e) {
        console.error("Native fetch failed:", e);
    }
}

inspect();
