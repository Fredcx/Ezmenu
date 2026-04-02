
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function inspect() {
    console.log("--- Inspecting Consumption History Table via REST ---");
    try {
        const response = await fetch(`${url}/rest/v1/consumption_history?limit=1`, {
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
                console.log("Table is empty. Fetching spec...");
                const specResponse = await fetch(`${url}/rest/v1/`, {
                    headers: { 'apikey': key }
                });
                const spec = await specResponse.json();
                const def = spec.definitions?.consumption_history;
                if (def) {
                    console.log("Consumption History columns:", Object.keys(def.properties));
                } else {
                    console.log("Could not find definition.");
                }
            }
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

inspect();
