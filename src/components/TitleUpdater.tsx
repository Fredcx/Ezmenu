
import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function TitleUpdater() {
    const location = useLocation();
    const params = useParams(); // Start with empty params, might not work inside App if not under Route

    useEffect(() => {
        const updateTitle = async () => {
            const path = location.pathname;
            const parts = path.split('/').filter(Boolean);

            // Default
            document.title = 'EzMenu - Cardápio Digital';

            if (parts.length === 0) return;

            const slug = parts[0];

            // Ignored routes
            if (['admin', 'superadmin', 'login', 'reservations'].includes(slug)) {
                if (path.includes('/admin')) document.title = 'EzMenu - Admin';
                if (path.includes('/superadmin')) document.title = 'EzMenu - Super Admin';
                return;
            }

            // If it looks like a restaurant slug
            if (slug) {
                try {
                    // Try to get from cache first if possible, or simple query
                    const { data } = await supabase
                        .from('establishments')
                        .select('name')
                        .eq('slug', slug)
                        .single();

                    if (data) {
                        document.title = `EzMenu - ${data.name}`;
                    }
                } catch (e) {
                    // Fallback
                }
            }
        };

        updateTitle();
    }, [location]);

    return null;
}
