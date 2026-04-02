
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { categories as localRodizioCats, alacarteCategories as localAlacarteCats } from './src/data/menuData.ts';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function compare() {
    const { data: dbCats } = await supabase.from('categories').select('*');
    const localCats = [...localRodizioCats, ...localAlacarteCats];

    console.log("--- Category Comparison ---");
    const report = dbCats?.map(db => {
        const match = localCats.find(l => l.name === db.name);
        return {
            db_name: db.name,
            db_type: db.type,
            local_match: match ? 'YES' : 'NO',
            local_id: match ? match.id : 'N/A'
        };
    });
    console.table(report);

    console.log("\n--- Checking for exact matches for reported categories ---");
    const targets = ['Combinados', 'Quentes', 'Veggies', "Roll's", 'Temaki', 'Joy', 'Duplas', 'Carritos-Chefe', 'Bebidas'];
    targets.forEach(t => {
        const match = localCats.find(lc => lc.name === t);
        console.log(`${t}: ${match ? 'FOUND (' + match.id + ')' : 'NOT FOUND'}`);
    });
}

compare();
