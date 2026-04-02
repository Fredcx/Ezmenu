-- 1. Rebaixar o admin@ezmenu.com para admin de restaurante (Art of Sushi)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@ezmenu.com';

-- 2. Garantir que o admin@ezmenu.com está vinculado ao ID correto do Art of Sushi
-- (ID ja verificado: e09f0015-a41f-43c8-a6c3-986027adcdd1)
UPDATE profiles 
SET establishment_id = 'e09f0015-a41f-43c8-a6c3-986027adcdd1'
WHERE email = 'admin@ezmenu.com';

-- 3. Criar ou atualizar o email root para ser o ÚNICO super_admin
-- Nota: O usuário precisará criar este login no AdminLogin ou SuperAdminLogin se não existir
UPDATE profiles
SET role = 'super_admin', establishment_id = NULL
WHERE email = 'root@ezmenu.com';
