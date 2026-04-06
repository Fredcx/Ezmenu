
-- FUNÇÃO PARA CRIAR GARÇOM DIRETAMENTE PELO BANCO (SQL EDITOR)
-- Copie e cole todo esse código no seu SQL Editor do Supabase e clique em 'Run'

CREATE OR REPLACE FUNCTION public.create_staff_member(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_establishment_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios de sistema para gravar em auth.users
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_est_id UUID;
BEGIN
  -- 1. Identifica quem está chamando a função
  v_caller_id := auth.uid();
  
  -- 2. Verifica se o chamador é Admin
  SELECT role, establishment_id INTO v_caller_role, v_caller_est_id
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Apenas administradores podem criar equipe.');
  END IF;

  -- 3. Verifica se está criando para o próprio restaurante (se não for super_admin)
  IF v_caller_role = 'admin' AND v_caller_est_id != p_establishment_id THEN
    RETURN json_build_object('success', false, 'error', 'Você só pode criar equipe para o seu próprio restaurante.');
  END IF;

  -- 4. Cria o usuário no Auth (Tabela interna do Supabase)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_strip_nulls(jsonb_build_object('full_name', p_full_name)),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- 5. Cria o perfil público vinculado
  INSERT INTO public.profiles (id, email, full_name, role, establishment_id)
  VALUES (v_user_id, p_email, p_full_name, 'waiter', p_establishment_id);

  RETURN json_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
