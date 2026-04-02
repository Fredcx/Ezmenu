-- Adicionar colunas para suporte a labels de área
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS is_label BOOLEAN DEFAULT FALSE;
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS label_name TEXT;

-- Garantir que as tabelas de pedidos ignorem labels
-- (Geralmente ja ignoram pois labels nao terao status occupied/etc mas e bom ter as colunas)
