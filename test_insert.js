import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
    const { data: ests } = await supabase.from('establishments').select('id, settings');
    if (!ests || ests.length === 0) return;
    const est = ests[0];

    // Find or create 'system' category
    let { data: sysCat } = await supabase.from('categories').select('id').eq('establishment_id', est.id).eq('name', 'Sistema').single();
    if (!sysCat) {
        const { data: newCat, error } = await supabase.from('categories').insert({
            establishment_id: est.id,
            name: 'Sistema',
            icon: 'settings',
            type: 'rodizio'
        }).select().single();
        if (error) { console.error("Error creating sysCat for", est.id, error); return; }
        sysCat = newCat;
    }

    // Delete existing buggy SYS
    await supabase.from('menu_items')
        .delete()
        .in('code', ['SYS01', 'SYS02'])
        .eq('establishment_id', est.id);

    // Insert SYS01
    const { error: e1 } = await supabase.from('menu_items').insert({
        code: 'SYS01',
        name: 'Rodízio Adulto',
        description: 'Buffet livre adulto',
        price: 129.99,
        is_rodizio: false,
        category_id: sysCat.id,
        station: 'kitchen',
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
        establishment_id: est.id
    });
    console.log("Insert SYS01 error:", e1);
}
testInsert();
