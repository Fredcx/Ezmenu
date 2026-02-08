-- 1. Adicionar colunas de configuração em establishments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='show_tables') THEN
        ALTER TABLE public.establishments ADD COLUMN show_tables BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='show_queue') THEN
        ALTER TABLE public.establishments ADD COLUMN show_queue BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='show_reservations') THEN
        ALTER TABLE public.establishments ADD COLUMN show_reservations BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Criar tabela de Fila de Espera (waiting_queue)
CREATE TABLE IF NOT EXISTS public.waiting_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES public.establishments(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT, -- Novo
    customer_cpf TEXT,   -- Novo
    party_size INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'called', 'seated', 'cancelled')) DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Criar tabela de Reservas (reservations)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES public.establishments(id),
    customer_id UUID REFERENCES public.profiles(id), -- Vinculado à conta
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    party_size INTEGER NOT NULL DEFAULT 1,
    reservation_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Habilitar RLS
ALTER TABLE public.waiting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança (Simplificadas para Desenvolvimento)
DROP POLICY IF EXISTS "Public for queue" ON public.waiting_queue;
CREATE POLICY "Public for queue" ON public.waiting_queue FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public for reservations" ON public.reservations;
CREATE POLICY "Public for reservations" ON public.reservations FOR ALL USING (true) WITH CHECK (true);

-- NOTA: Em produção, o RLS deve filtrar por establishment_id via JWT ou parâmetro restrito.
-- Para o estágio atual, as políticas acima permitem o desenvolvimento rápido.
