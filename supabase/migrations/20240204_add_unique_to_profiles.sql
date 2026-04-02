-- Adicionar restrição UNIQUE à coluna email da tabela profiles
-- Isso é necessário para que a operação UPSERT (onConflict='email') funcione

DO $$ 
BEGIN
    -- 1. Remover duplicatas caso existam (mantendo o registro mais antigo)
    -- Isso evita erros ao tentar criar o índice único
    DELETE FROM public.profiles a USING (
      SELECT MIN(created_at) as min_date, email 
      FROM public.profiles 
      GROUP BY email 
      HAVING COUNT(*) > 1
    ) b
    WHERE a.email = b.email 
    AND a.created_at > b.min_date;

    -- 2. Adicionar o índice UNIQUE se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'profiles' 
        AND indexname = 'profiles_email_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;
