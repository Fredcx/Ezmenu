-- 1. Garantir que a tabela profiles tenha a estrutura necessária
DO $$ 
BEGIN
    -- Adicionar full_name se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;

    -- Adicionar establishment_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='establishment_id') THEN
        ALTER TABLE public.profiles ADD COLUMN establishment_id UUID REFERENCES public.establishments(id);
    END IF;

    -- Atualizar check de roles
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'waiter', 'client'));
END $$;

-- 2. Adicionar establishment_id em tabelas que faltavam
DO $$ 
BEGIN
    -- consumption_history
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='consumption_history') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumption_history' AND column_name='establishment_id') THEN
        ALTER TABLE public.consumption_history ADD COLUMN establishment_id UUID REFERENCES public.establishments(id);
    END IF;

    -- recipes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='recipes') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='establishment_id') THEN
        ALTER TABLE public.recipes ADD COLUMN establishment_id UUID REFERENCES public.establishments(id);
    END IF;

    -- inventory
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='inventory') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='establishment_id') THEN
        ALTER TABLE public.inventory ADD COLUMN establishment_id UUID REFERENCES public.establishments(id);
    END IF;
END $$;

-- 3. Vincular dados órfãos ao primeiro estabelecimento (Art of Sushi)
DO $$
DECLARE
    sushi_id UUID;
BEGIN
    SELECT id INTO sushi_id FROM public.establishments WHERE slug = 'art-of-sushi';
    
    IF sushi_id IS NOT NULL THEN
        UPDATE public.profiles SET establishment_id = sushi_id WHERE establishment_id IS NULL;
        UPDATE public.consumption_history SET establishment_id = sushi_id WHERE establishment_id IS NULL;
        UPDATE public.recipes SET establishment_id = sushi_id WHERE establishment_id IS NULL;
        UPDATE public.inventory SET establishment_id = sushi_id WHERE establishment_id IS NULL;
        
        -- Tabelas core (por precaução)
        UPDATE public.restaurant_tables SET establishment_id = sushi_id WHERE establishment_id IS NULL;
        UPDATE public.orders SET establishment_id = sushi_id WHERE establishment_id IS NULL;
        UPDATE public.menu_items SET establishment_id = sushi_id WHERE establishment_id IS NULL;
        UPDATE public.categories SET establishment_id = sushi_id WHERE establishment_id IS NULL;
        UPDATE public.service_requests SET establishment_id = sushi_id WHERE establishment_id IS NULL;
    END IF;
END $$;
