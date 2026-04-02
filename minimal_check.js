
import { createClient } from '@supabase/supabase-js';
import process from 'process';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data: cats } = await supabase.from('categories').select('id, name, type');
    const { data: items } = await supabase.from('menu_items').select('category_id');

    const report = cats.map(c => ({
        name: c.name,
        type: c.type,
        items: items.filter(i => i.category_id === c.id).length
    }));

    console.log(JSON.stringify(report.filter(r => r.items === 0), null, 2));
}

check();
