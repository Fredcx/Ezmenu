import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixSysItems() {
    const { data: ests } = await supabase.from('establishments').select('id, settings');
    if (!ests) return;

    for (const est of ests) {
        // Find or create 'system' category
        let { data: sysCat } = await supabase.from('categories').select('id').eq('establishment_id', est.id).eq('name', 'Sistema').single();
        if (!sysCat) {
            const { data: newCat, error } = await supabase.from('categories').insert({
                establishment_id: est.id,
                name: 'Sistema',
                icon: 'settings',
                type: 'rodizio'
            }).select().single();
            if (error) { console.error("Error creating sysCat for", est.id, error); continue; }
            sysCat = newCat;
        }

        const pAdult = est.settings?.rodizio_price_adult || 129.99;
        const pChild = est.settings?.rodizio_price_child || 69.99;

        // Delete existing buggy SYS
        await supabase.from('menu_items')
            .delete()
            .in('code', ['SYS01', 'SYS02'])
            .eq('establishment_id', est.id);

        // Insert SYS01
        await supabase.from('menu_items').insert({
            code: 'SYS01',
            name: 'Rodízio Adulto',
            description: 'Buffet livre adulto',
            price: pAdult,
            is_rodizio: false,
            category_id: sysCat.id,
            station: 'kitchen',
            image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
            establishment_id: est.id
        });

        // Insert SYS02
        await supabase.from('menu_items').insert({
            code: 'SYS02',
            name: 'Rodízio Infantil',
            description: 'Buffet livre infantil (até 10 anos)',
            price: pChild,
            is_rodizio: false,
            category_id: sysCat.id,
            station: 'kitchen',
            image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
            establishment_id: est.id
        });
        
        console.log("Done for", est.id);
    }
}
fixSysItems();
