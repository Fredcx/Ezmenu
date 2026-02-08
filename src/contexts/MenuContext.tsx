import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { MenuItem } from './OrderContext';
import { supabase } from '@/lib/supabase';
import { categories as localRodizioCats, alacarteCategories as localAlacarteCats } from '@/data/menuData';

export interface Category {
    id: string;
    name: string;
    icon: string;
    dbId?: string;
}

interface MenuContextType {
    items: MenuItem[];
    categories: Category[]; // Rodizio categories
    alacarteCategories: Category[]; // Alacarte categories
    addItem: (item: Omit<MenuItem, 'id'>) => void;
    updateItem: (id: string, updates: Partial<MenuItem>) => void;
    deleteItem: (id: string) => void;
    refreshMenu: () => void;
    isLoading: boolean;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [alacarteCategories, setAlacarteCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentEstablishmentId, setCurrentEstablishmentId] = useState<string | null>(null);

    const loadMenuData = async (establishmentId: string) => {
        setIsLoading(true);
        console.log("Supabase: Loading menu data for establishment:", establishmentId);
        try {
            // 1. Fetch Categories
            const { data: catData, error: catError } = await supabase
                .from('categories')
                .select('*')
                .eq('establishment_id', establishmentId);

            if (catError) throw catError;

            let catMap: any[] = [];
            if (catData) {
                const mapToFrontendCat = (c: any) => {
                    const local = [...localRodizioCats, ...localAlacarteCats].find(l => l.name === c.name);
                    return {
                        id: local ? local.id : c.id,
                        name: c.name,
                        icon: c.icon,
                        dbId: c.id
                    };
                };
                catMap = catData;
                setCategories(catData.filter(c => c.type === 'rodizio').map(mapToFrontendCat));
                setAlacarteCategories(catData.filter(c => c.type === 'alacarte').map(mapToFrontendCat));
            }

            // 2. Fetch Menu Items with categories join
            const { data: itemData, error: itemError } = await supabase
                .from('menu_items')
                .select(`
                    *,
                    categories (id, name)
                `)
                .eq('establishment_id', establishmentId);

            if (itemError) {
                console.warn("Join failed, trying fallback select...");
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('establishment_id', establishmentId);

                if (fallbackError) throw fallbackError;

                const formattedItems: MenuItem[] = (fallbackData || []).map(item => {
                    const categoryObj = catMap.find(c => c.id === item.category_id);
                    const categoryName = categoryObj?.name;
                    const localCat = [...localRodizioCats, ...localAlacarteCats].find(c => c.name === categoryName);

                    return {
                        id: item.id,
                        code: item.code,
                        name: item.name,
                        description: item.description || '',
                        price: Number(item.price),
                        isRodizio: item.is_rodizio,
                        image: item.image_url || '',
                        category: localCat ? localCat.id : (categoryName || ''),
                        station: item.station,
                        allergens: item.allergens || [],
                        tags: item.tags || []
                    };
                });
                setItems(formattedItems);
            } else if (itemData) {
                console.log("Menu Items Fetched:", itemData.length);
                const formattedItems: MenuItem[] = itemData.map(item => {
                    const categoryName = Array.isArray(item.categories)
                        ? (item.categories[0] as any)?.name
                        : (item.categories as any)?.name;
                    const localCat = [...localRodizioCats, ...localAlacarteCats].find(c => c.name === categoryName);

                    return {
                        id: item.id,
                        code: item.code,
                        name: item.name,
                        description: item.description || '',
                        price: Number(item.price),
                        isRodizio: item.is_rodizio,
                        image: item.image_url || '',
                        category: localCat ? localCat.id : (categoryName || ''),
                        station: item.station,
                        allergens: item.allergens || [],
                        tags: item.tags || []
                    };
                });
                setItems(formattedItems);
            }
        } catch (error) {
            console.error("Failed to load menu from Supabase:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadInitial = async () => {
        const parts = window.location.pathname.split('/');
        const currentSlug = parts[1];

        // Case 1: Admin Route
        if (currentSlug === 'admin') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Determine establishment from profile/staff table
                // Assuming we can get it from profiles or a staff mapping. 
                // For now, let's try to get it from our profile logic or local storage if possible, 
                // but strictly speaking we should query the DB.

                // Optimized: Check if we have the est ID from a previous login step or query it.
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('establishment_id')
                    .eq('id', user.id)
                    .single();

                console.log("Admin Load - User:", user.id, "Profile EST:", profile?.establishment_id);

                if (profile?.establishment_id) {
                    setCurrentEstablishmentId(profile.establishment_id);
                    loadMenuData(profile.establishment_id);
                } else {
                    console.warn("Admin Load - No establishment_id found for user profile");
                    setIsLoading(false);
                }
            } else {
                console.warn("Admin Load - No user found");
                setIsLoading(false);
            }
            return;
        }

        // Case 2: Discovery/Superadmin - skip
        if (!currentSlug || currentSlug === 'superadmin') {
            setIsLoading(false);
            return;
        }

        // Case 3: Public Restaurant Page (Slug)
        const { data: establishment } = await supabase
            .from('establishments')
            .select('id')
            .eq('slug', currentSlug)
            .single();

        if (establishment) {
            setCurrentEstablishmentId(establishment.id);
            loadMenuData(establishment.id);
        } else {
            setIsLoading(false);
        }
    };

    const location = useLocation();

    useEffect(() => {
        loadInitial();

        const itemsChannel = supabase.channel('menu_items_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
                loadInitial();
            })
            .subscribe();

        const categoriesChannel = supabase.channel('categories_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
                loadInitial();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(itemsChannel);
            supabase.removeChannel(categoriesChannel);
        };
    }, [location.pathname]);

    const addItem = async (itemData: Omit<MenuItem, 'id'>) => {
        if (!currentEstablishmentId) return;
        try {
            const category = [...categories, ...alacarteCategories].find(c => c.id === itemData.category || c.name === itemData.category);
            const categoryUUID = (category as any)?.dbId || category?.id;

            const { error } = await supabase.from('menu_items').insert({
                code: itemData.code,
                name: itemData.name,
                description: itemData.description,
                price: itemData.price,
                category_id: categoryUUID,
                image_url: itemData.image,
                is_rodizio: itemData.isRodizio,
                station: itemData.station,
                allergens: itemData.allergens,
                tags: itemData.tags,
                establishment_id: currentEstablishmentId
            });

            if (error) throw error;
        } catch (error) {
            console.error("Error adding item:", error);
        }
    };

    const updateItem = async (id: string, updates: Partial<MenuItem>) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.price !== undefined) dbUpdates.price = updates.price;
            if (updates.image !== undefined) dbUpdates.image_url = updates.image;
            if (updates.isRodizio !== undefined) dbUpdates.is_rodizio = updates.isRodizio;
            if (updates.station) dbUpdates.station = updates.station;
            if (updates.allergens) dbUpdates.allergens = updates.allergens;
            if (updates.tags) dbUpdates.tags = updates.tags;

            if (updates.category) {
                const category = [...categories, ...alacarteCategories].find(c => c.id === updates.category || c.name === updates.category);
                const categoryUUID = (category as any)?.dbId || category?.id;
                if (categoryUUID) dbUpdates.category_id = categoryUUID;
            }

            const { error } = await supabase
                .from('menu_items')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating item:", error);
        }
    };

    const deleteItem = async (id: string) => {
        try {
            const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    const refreshMenu = () => loadInitial();

    return (
        <MenuContext.Provider value={{
            items,
            categories,
            alacarteCategories,
            addItem,
            updateItem,
            deleteItem,
            refreshMenu,
            isLoading
        }}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
}
