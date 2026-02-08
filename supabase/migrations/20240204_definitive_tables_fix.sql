-- Migração Definitiva para Corrigir a Tabela de Mesas
-- Garante que todas as colunas usadas no frontend existam no banco de dados

DO $$ 
BEGIN
    -- 1. Coluna de Status e Atividade
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='status') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN status TEXT DEFAULT 'free';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='last_activity_at') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- 2. Colunas de Geometria/Layout (Normalização)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='top_pos') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN top_pos TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='left_pos') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN left_pos TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='width') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN width TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='height') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN height TEXT;
    END IF;

    -- 3. Colunas de Customização (Labels e Divisores)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='is_label') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN is_label BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='label_name') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN label_name TEXT;
    END IF;

    -- 4. Vínculo com Estabelecimento (Multi-tenant)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_tables' AND column_name='establishment_id') THEN
        ALTER TABLE public.restaurant_tables ADD COLUMN establishment_id UUID REFERENCES public.establishments(id);
    END IF;

    -- 5. Constraint de Unicidade (Opcional se ID for global, mas recomendado se quiser IDs iguais por restaurante)
    -- ALTER TABLE public.restaurant_tables DROP CONSTRAINT IF EXISTS restaurant_tables_pkey;
    -- ALTER TABLE public.restaurant_tables ADD PRIMARY KEY (id, establishment_id);

END $$;
