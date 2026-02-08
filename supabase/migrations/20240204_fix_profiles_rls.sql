-- 1. Habilitar RLS na tabela profiles (caso ainda não esteja)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas existentes para evitar erros de duplicata
DROP POLICY IF EXISTS "Permitir cadastro público" ON public.profiles;
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualização por e-mail" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles are viewable by everyone" ON public.profiles;

-- 3. Criar política para permitir o CADASTRO (INSERT)
-- Permite que qualquer pessoa insira um novo perfil
CREATE POLICY "Permitir cadastro público" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- 4. Criar política para permitir a LEITURA (SELECT)
-- Necessário para o login verificar se o e-mail já existe
CREATE POLICY "Permitir leitura pública" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 5. Criar política para permitir a ATUALIZAÇÃO (UPDATE)
-- Permite que o usuário (ou app) atualize os dados baseados no registro
CREATE POLICY "Permitir atualização por e-mail" 
ON public.profiles 
FOR UPDATE 
USING (true)
WITH CHECK (true);
