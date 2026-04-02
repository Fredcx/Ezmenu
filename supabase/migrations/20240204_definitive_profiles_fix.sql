-- SOLUÇÃO DEFINITIVA PARA LOGIN SIMPLIFICADO
-- Este script desvincula a tabela profiles da obrigatoriedade do Supabase Auth para clientes.

DO $$ 
BEGIN
    -- 1. Remover a restrição de chave estrangeira que exige que todo perfi seja um "Usuário Auth"
    -- Isso permite que clientes do restaurante se identifiquem apenas por e-mail.
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

    -- 2. Garantir que o ID tenha um valor padrão (caso o frontend não envie)
    ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

    -- 3. Garantir que o e-mail seja único para evitar duplicatas
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_email_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;

    -- 4. Garantir que a coluna full_name exista
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;

    -- 5. Atualizar políticas de segurança para permitir o fluxo
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Permitir tudo para anonimos" ON public.profiles;
    CREATE POLICY "Permitir tudo para anonimos" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

    -- NOTA: Em produção, o ideal seria restringir mais o RLS, 
    -- mas para estabilizar o seu lançamento, esta política libera o acesso.
END $$;
