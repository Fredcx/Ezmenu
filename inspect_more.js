
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function inspect(table) {
    console.log(`--- Inspecting ${table} ---`);
    try {
        const response = await fetch(`${url}/rest/v1/${table}?limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });

        const specResponse = await fetch(`${url}/rest/v1/`, {
            headers: { 'apikey': key }
        });
        const spec = await specResponse.json();
        const def = spec.definitions?.[table];
        if (def) {
            console.log(`${table} columns:`, Object.keys(def.properties));
        } else {
            console.log(`Could not find definition for ${table}.`);
        }
    } catch (e) {
        console.error(`Fetch failed for ${table}:`, e);
    }
}

async function run() {
    await inspect('recipes');
    await inspect('inventory');
}

run();
