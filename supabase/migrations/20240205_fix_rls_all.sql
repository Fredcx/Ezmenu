-- Fix RLS Policies for Menu, Stock, and Recipes

-- 1. Menu Items (Public Read, Admin Write)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public View Menu" ON menu_items;
CREATE POLICY "Public View Menu" ON menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Manage Menu" ON menu_items;
CREATE POLICY "Admin Manage Menu" ON menu_items FOR ALL 
USING (
    establishment_id IN (
        SELECT establishment_id FROM profiles WHERE id = auth.uid()
    )
)
WITH CHECK (
    establishment_id IN (
        SELECT establishment_id FROM profiles WHERE id = auth.uid()
    )
);

-- 2. Categories (Public Read, Admin Write)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public View Categories" ON categories;
CREATE POLICY "Public View Categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Manage Categories" ON categories;
CREATE POLICY "Admin Manage Categories" ON categories FOR ALL 
USING (
    establishment_id IN (
        SELECT establishment_id FROM profiles WHERE id = auth.uid()
    )
);

-- 3. Stock Items (Admin Only)
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Stock" ON stock_items;
CREATE POLICY "Admin Manage Stock" ON stock_items FOR ALL 
USING (
    establishment_id IN (
        SELECT establishment_id FROM profiles WHERE id = auth.uid()
    )
);

-- 4. Recipes (Admin Only)
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Recipes" ON product_recipes;
CREATE POLICY "Admin Manage Recipes" ON product_recipes FOR ALL
USING (
    establishment_id IN (
        SELECT establishment_id FROM profiles WHERE id = auth.uid()
    )
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Ingredients" ON ingredients;
CREATE POLICY "Admin Manage Ingredients" ON ingredients FOR ALL
USING (
    establishment_id IN (
        SELECT establishment_id FROM profiles WHERE id = auth.uid()
    )
);
