-- 1. Habilitar extensão de criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Função auxiliar para criar usuário no Supabase Auth
CREATE OR REPLACE FUNCTION create_demo_user_pedro(
    param_email text, 
    param_password text, 
    param_name text, 
    param_role user_role
) RETURNS void AS $$
DECLARE
    new_user_id uuid;
BEGIN
    SELECT id INTO new_user_id FROM auth.users WHERE email = param_email;

    IF new_user_id IS NULL THEN
        new_user_id := uuid_generate_v4();
        
        INSERT INTO auth.users (
            id, 
            instance_id, 
            aud, 
            role, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            recovery_sent_at, 
            last_sign_in_at, 
            raw_app_meta_data, 
            raw_user_meta_data, 
            created_at, 
            updated_at, 
            confirmation_token, 
            email_change, 
            email_change_token_new, 
            recovery_token
        ) VALUES (
            new_user_id, 
            '00000000-0000-0000-0000-000000000000', 
            'authenticated', 
            'authenticated', 
            param_email, 
            crypt(param_password, gen_salt('bf')),
            NOW(), 
            NOW(), 
            NOW(), 
            '{"provider":"email","providers":["email"]}', 
            json_build_object('name', param_name), 
            NOW(), 
            NOW(), 
            '', 
            '', 
            '', 
            ''
        );

        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            new_user_id,
            json_build_object('sub', new_user_id, 'email', param_email),
            'email',
            new_user_id,
            NOW(),
            NOW(),
            NOW()
        );
    END IF;

    UPDATE public.system_users 
    SET auth_user_id = new_user_id 
    WHERE email = param_email;

    IF NOT FOUND THEN
        INSERT INTO public.system_users (auth_user_id, name, email, role, unit_id)
        VALUES (new_user_id, param_name, param_email, param_role, '550e8400-e29b-41d4-a716-446655440011');
    END IF;

END;
$$ LANGUAGE plpgsql;

-- 3. Criar Dr. Pedro Santos no Supabase Auth (Senha: 123456)
SELECT create_demo_user_pedro('pedro@fisiostar.com', '123456', 'Dr. Pedro Santos', 'professional');

DROP FUNCTION create_demo_user_pedro;

-- 4. Garantir registro na tabela professionals e professional_units
INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color)
VALUES (
  '550e8400-e29b-41d4-a716-446655440022',
  'Dr. Pedro Santos',
  'CREFITO-3/67890-F',
  'Pilates',
  85.00,
  '#10B981'
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  crf = EXCLUDED.crf,
  specialty = EXCLUDED.specialty,
  hourly_rate = EXCLUDED.hourly_rate,
  color = EXCLUDED.color;

INSERT INTO professional_units (professional_id, unit_id)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440011'),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440012')
ON CONFLICT DO NOTHING;
