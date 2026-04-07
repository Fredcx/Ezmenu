-- FUNÇÃO PARA CRIAR GARÇOM DIRETAMENTE PELO BANCO (SQL EDITOR)
-- Copie e cole todo esse código no seu SQL Editor do Supabase e clique em 'Run'

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_staff_member(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_establishment_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios de sistema para gravar em auth.users
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_caller_id UUID;
  v_caller_email TEXT;
  v_caller_role TEXT;
  v_caller_est_id UUID;
  v_instance_id UUID;
BEGIN
  -- 1. Identifica quem está chamando a função e seu e-mail seguro
  v_caller_id := auth.uid();
  v_caller_email := auth.jwt() ->> 'email';
  
  -- 2. Verifica se o chamador é Admin/SuperAdmin
  -- Tenta pelo ID primeiro, depois pelo email (caso o ID esteja desalinhado)
  SELECT role, establishment_id INTO v_caller_role, v_caller_est_id
  FROM public.profiles
  WHERE id = v_caller_id OR email = v_caller_email
  ORDER BY (id = v_caller_id) DESC -- Prefere o match por ID se houver ambos
  LIMIT 1;

  IF v_caller_role NOT IN ('admin', 'super_admin', 'establishment_admin') OR v_caller_role IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Apenas administradores podem criar equipe. (Sua conta: ' || COALESCE(v_caller_email, 'Email não detectado') || ' | Role: ' || COALESCE(v_caller_role, 'Nenhuma') || ' | ID: ' || COALESCE(v_caller_id::text, 'ID não detectado') || ')'
    );
  END IF;

  -- 3. Verifica se está criando para o próprio restaurante (se não for super_admin)
  IF v_caller_role = 'admin' AND v_caller_est_id != p_establishment_id THEN
    RETURN json_build_object('success', false, 'error', 'Você só pode criar equipe para o seu próprio restaurante.');
  END IF;

  -- 4. Tenta descobrir o instance_id atual do projeto
  SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- 5. Normaliza o email
  p_email := lower(trim(p_email));

  BEGIN
    -- 6. Tenta criar o usuário NOVO no Auth
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
      recovery_token,
      is_sso_user,
      is_anonymous
    )
    VALUES (
      v_instance_id,
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_strip_nulls(jsonb_build_object('full_name', p_full_name)),
      now(),
      now(),
      '',
      '',
      '',
      '',
      false,
      false
    )
    RETURNING id INTO v_user_id;
  EXCEPTION WHEN unique_violation THEN
    -- Usuário já existe, vamos atualizar a senha e garantir que está ativo
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    UPDATE auth.users SET 
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = now(),
      updated_at = now(),
      raw_user_meta_data = jsonb_strip_nulls(jsonb_build_object('full_name', p_full_name))
    WHERE id = v_user_id;
  END;

  -- 7. Cria ou Atualiza o perfil público vinculado
  INSERT INTO public.profiles (id, email, full_name, role, establishment_id)
  VALUES (v_user_id, p_email, p_full_name, 'waiter', p_establishment_id)
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    establishment_id = EXCLUDED.establishment_id;

  RETURN json_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
