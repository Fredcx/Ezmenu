-- 1. Garantir que a extensão pgcrypto esteja disponível (para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Adicionar o valor padrão gen_random_uuid() para a coluna id da tabela profiles
-- Isso permite que o banco de dados gere o ID automaticamente se não for enviado
DO $$ 
BEGIN
    ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION
    WHEN others THEN
        -- Caso gen_random_uuid falhe ou já exista algo, tenta uuid_generate_v4
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
END $$;
