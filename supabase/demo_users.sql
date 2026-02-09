-- RESTAURAR USUÁRIOS DEMO (Login Screen)
-- Usuários: admin (admin@fisiostar.com), secretaria (nay@fisiostar.com), profissional (ana.silva@fisiostar.com)
-- Senha Padrão: 123456

-- 1. Habilitar extensão de criptografia (caso não tenha)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Função auxiliar para criar usuário (Evita duplicação de código)
CREATE OR REPLACE FUNCTION create_demo_user(
    param_email text, 
    param_password text, 
    param_name text, 
    param_role user_role
) RETURNS void AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Verifica se usuário já existe em auth.users
    SELECT id INTO new_user_id FROM auth.users WHERE email = param_email;

    -- Se não existir, cria
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
            crypt(param_password, gen_salt('bf')), -- Senha Criptografada
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

        -- Cria identidade (Importante para o login funcionar corretamente)
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

    -- Atualiza ou Cria na tabela pública (system_users)
    -- Tenta atualizar primeiro
    UPDATE public.system_users 
    SET auth_user_id = new_user_id 
    WHERE email = param_email;

    -- Se não atualizou nada (não existia), insere
    IF NOT FOUND THEN
        INSERT INTO public.system_users (auth_user_id, name, email, role)
        VALUES (new_user_id, param_name, param_email, param_role);
    END IF;

END;
$$ LANGUAGE plpgsql;

-- 3. Executar criação dos usuários
-- Admin
SELECT create_demo_user('admin@fisiostar.com', '123456', 'Administrador Demo', 'admin');

-- Secretaria (Nay)
SELECT create_demo_user('nay@fisiostar.com', '123456', 'Nairelle Secretaria', 'secretary');

-- Profissional (Ana Silva)
SELECT create_demo_user('ana.silva@fisiostar.com', '123456', 'Dra. Ana Silva', 'professional');

-- Limpeza (Remove a função auxiliar)
DROP FUNCTION create_demo_user;
