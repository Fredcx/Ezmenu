-- First, create a system category if it doesn't exist
INSERT INTO categories (name, description, establishment_id)
SELECT 'system', 'Itens de Sistema (Rodízio)', id 
FROM establishments 
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'system' AND categories.establishment_id = establishments.id
);

-- Then, insert SYS01 (Rodízio Adulto) for all establishments
INSERT INTO menu_items (code, name, description, price, is_rodizio, category, establishment_id)
SELECT 'SYS01', 'Rodízio Adulto', 'Buffet livre adulto', 129.90, false, 'system', id
FROM establishments
WHERE NOT EXISTS (
  SELECT 1 FROM menu_items WHERE code = 'SYS01' AND menu_items.establishment_id = establishments.id
);

-- Insert SYS02 (Rodízio Infantil) for all establishments
INSERT INTO menu_items (code, name, description, price, is_rodizio, category, establishment_id)
SELECT 'SYS02', 'Rodízio Infantil', 'Buffet livre infantil (até 10 anos)', 69.90, false, 'system', id
FROM establishments
WHERE NOT EXISTS (
  SELECT 1 FROM menu_items WHERE code = 'SYS02' AND menu_items.establishment_id = establishments.id
);
