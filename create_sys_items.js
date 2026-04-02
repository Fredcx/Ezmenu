import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function createSysItems() {
    const { data: ests } = await supabase.from('establishments').select('id, settings');
    if (!ests) return;

    for (const est of ests) {
        const pAdult = est.settings?.rodizio_price_adult || 129.99;
        const pChild = est.settings?.rodizio_price_child || 69.99;

        // Try to insert SYS01
        try {
            await supabase.from('menu_items').insert({
                code: 'SYS01',
                name: 'Rodízio Adulto',
                description: 'Buffet livre adulto',
                price: pAdult,
                is_rodizio: false,
                category: 'system',
                station: 'kitchen',
                image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
                establishment_id: est.id
            });
            console.log(`Inserted SYS01 for ${est.id}`);
        } catch (e) {
            console.log(`Failed or already exists SYS01 for ${est.id}`);
        }

        // Try to insert SYS02
        try {
            await supabase.from('menu_items').insert({
                code: 'SYS02',
                name: 'Rodízio Infantil',
                description: 'Buffet livre infantil (até 10 anos)',
                price: pChild,
                is_rodizio: false,
                category: 'system',
                station: 'kitchen',
                image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
                establishment_id: est.id
            });
            console.log(`Inserted SYS02 for ${est.id}`);
        } catch (e) {
            console.log(`Failed or already exists SYS02 for ${est.id}`);
        }
    }
}
createSysItems();
