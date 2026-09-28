-- ==============================================================================
-- FisioStar: Cadastro dos Usuários Reais da Clínica no Sistema e Supabase Auth
-- Arquivo: supabase/seed_real_system_users.sql
-- Senha Padrão de Acesso: 123456
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função auxiliar idempotente para cadastrar ou sincronizar usuário no Auth e no system_users
CREATE OR REPLACE FUNCTION upsert_fisiostar_user(
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_role user_role,
    p_unit_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_clean_email TEXT := LOWER(TRIM(p_email));
BEGIN
    -- 1. Verificar se usuário já existe em auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email;

    -- Se não existir em auth.users, cria com senha criptografada (bcrypt)
    IF v_user_id IS NULL THEN
        v_user_id := uuid_generate_v4();

        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            v_clean_email,
            crypt(p_password, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            json_build_object('name', p_name),
            NOW(),
            NOW()
        );

        -- Cria identidade correspondente
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
            v_user_id,
            v_user_id,
            json_build_object('sub', v_user_id, 'email', v_clean_email),
            'email',
            v_user_id,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
    ELSE
        -- Se já existe no Auth, garante senha válida
        UPDATE auth.users 
        SET encrypted_password = crypt(p_password, gen_salt('bf')),
            raw_user_meta_data = json_build_object('name', p_name),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 2. Upsert em public.system_users (Tabela exibida em Usuários e Permissões)
    INSERT INTO public.system_users (
        auth_user_id,
        name,
        email,
        role,
        unit_id,
        updated_at
    ) VALUES (
        v_user_id,
        p_name,
        v_clean_email,
        p_role,
        p_unit_id,
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        unit_id = COALESCE(EXCLUDED.unit_id, public.system_users.unit_id),
        updated_at = NOW();

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    v_unit_ararangua UUID := '550e8400-e29b-41d4-a716-446655440011';
    v_unit_arroio UUID := '550e8400-e29b-41d4-a716-446655440012';
BEGIN

    -- 1. ADMINS & GESTORES
    -- Dr. Pedro Santos (Sócio-Proprietário)
    PERFORM upsert_fisiostar_user('pedro@fisiostar.com', '123456', 'Dr. Pedro Santos', 'admin', v_unit_arroio);
    
    -- Administrador Geral da Clínica (substitui o antigo "Administrador Demo")
    PERFORM upsert_fisiostar_user('admin@fisiostar.com', '123456', 'Administrador FisioStar', 'admin', v_unit_ararangua);

    -- 2. FINANCEIRO
    PERFORM upsert_fisiostar_user('financeiro@fisiostar.com', '123456', 'Financeiro FisioStar', 'financial', v_unit_ararangua);

    -- 3. SECRETÁRIA & RECEPÇÃO
    PERFORM upsert_fisiostar_user('nay@fisiostar.com', '123456', 'Nairelle Secretaria', 'secretary', v_unit_arroio);

    -- 4. PROFISSIONAIS CLÍNICOS REAIS (Planilhas de Produção)
    -- Douglas Silva (Personal & Natação - Araranguá)
    PERFORM upsert_fisiostar_user('douglas@fisiostar.com', '123456', 'Douglas Silva', 'professional', v_unit_ararangua);

    -- Dra. Maria Laura (Pilates & Fisioterapia - Araranguá)
    PERFORM upsert_fisiostar_user('marialaura@fisiostar.com', '123456', 'Dra. Maria Laura', 'professional', v_unit_ararangua);

    -- Dr. Gabriel (CLT Traumato-Ortopedia - Arroio)
    PERFORM upsert_fisiostar_user('gabriel@fisiostar.com', '123456', 'Dr. Gabriel', 'professional', v_unit_arroio);

    -- Dra. Jeniffer (Pilates & Fisioterapia - Arroio)
    PERFORM upsert_fisiostar_user('jeniffer@fisiostar.com', '123456', 'Dra. Jeniffer', 'professional', v_unit_arroio);

    -- Dra. Danielle (Fisioterapia & Pilates - Arroio)
    PERFORM upsert_fisiostar_user('danielle@fisiostar.com', '123456', 'Dra. Danielle', 'professional', v_unit_arroio);

    -- Dra. Camila (Pilates & Fisioterapia - Arroio)
    PERFORM upsert_fisiostar_user('camila@fisiostar.com', '123456', 'Dra. Camila', 'professional', v_unit_arroio);

    -- Dra. Maíli (Fisioterapia - Arroio)
    PERFORM upsert_fisiostar_user('maili@fisiostar.com', '123456', 'Dra. Maíli', 'professional', v_unit_arroio);

    -- Dr. Giovanni (Fisioterapia - Arroio)
    PERFORM upsert_fisiostar_user('giovanni@fisiostar.com', '123456', 'Dr. Giovanni', 'professional', v_unit_arroio);

    -- Dr. Wlisses (Fisioterapia - Arroio)
    PERFORM upsert_fisiostar_user('wlisses@fisiostar.com', '123456', 'Dr. Wlisses', 'professional', v_unit_arroio);

    -- 5. SINCRONIZAR EMAIL NA TABELA PROFESSIONALS
    UPDATE professionals SET email = 'pedro@fisiostar.com' WHERE name ILIKE '%Pedro%';
    UPDATE professionals SET email = 'douglas@fisiostar.com' WHERE name ILIKE '%Douglas%';
    UPDATE professionals SET email = 'marialaura@fisiostar.com' WHERE name ILIKE '%Maria Laura%';
    UPDATE professionals SET email = 'gabriel@fisiostar.com' WHERE name ILIKE '%Gabriel%';
    UPDATE professionals SET email = 'jeniffer@fisiostar.com' WHERE name ILIKE '%Jeniffer%';

    -- Atualiza ou Insere Danielle com segurança em CRF
    INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, email)
    VALUES ('550e8400-e29b-41d4-a716-446655440029', 'Dra. Danielle', 'CREFITO 31092-F', 'Fisioterapia & Pilates', 70.00, '#8b5cf6', 'pj', 0.00, 'danielle@fisiostar.com')
    ON CONFLICT (crf) DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        specialty = EXCLUDED.specialty;

    -- Atualiza ou Insere Camila
    INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, email)
    VALUES ('550e8400-e29b-41d4-a716-446655440030', 'Dra. Camila', 'CREFITO 34182-F', 'Pilates Clínico', 65.00, '#f59e0b', 'pj', 0.00, 'camila@fisiostar.com')
    ON CONFLICT (crf) DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        specialty = EXCLUDED.specialty;

    -- Atualiza ou Insere Maíli
    INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, email)
    VALUES ('550e8400-e29b-41d4-a716-446655440031', 'Dra. Maíli', 'CREFITO 29481-F', 'Fisioterapia Geral', 75.00, '#10b981', 'pj', 0.00, 'maili@fisiostar.com')
    ON CONFLICT (crf) DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        specialty = EXCLUDED.specialty;

    -- Atualiza ou Insere Giovanni
    INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, email)
    VALUES ('550e8400-e29b-41d4-a716-446655440032', 'Dr. Giovanni', 'CREFITO 27192-F', 'Fisioterapia & Traumato', 80.00, '#06b6d4', 'pj', 0.00, 'giovanni@fisiostar.com')
    ON CONFLICT (crf) DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        specialty = EXCLUDED.specialty;

    -- Atualiza ou Insere Wlisses
    INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, email)
    VALUES ('550e8400-e29b-41d4-a716-446655440033', 'Dr. Wlisses', 'CREFITO 38192-F', 'Fisioterapia & Quiropraxia', 85.00, '#6366f1', 'pj', 0.00, 'wlisses@fisiostar.com')
    ON CONFLICT (crf) DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        specialty = EXCLUDED.specialty;

    -- 6. Garantir serviços de Natação de Douglas (Personal e Avaliação)
    DELETE FROM professional_services WHERE professional_id = '550e8400-e29b-41d4-a716-446655440025';
    INSERT INTO professional_services (professional_id, service_name, commission_type, commission_value)
    VALUES 
        ('550e8400-e29b-41d4-a716-446655440025', 'Natação', 'percentage', 50.00),
        ('550e8400-e29b-41d4-a716-446655440025', 'Personal Fisio', 'percentage', 50.00),
        ('550e8400-e29b-41d4-a716-446655440025', 'Avaliação', 'percentage', 60.00);

END;
$$ LANGUAGE plpgsql;

-- Remover a função auxiliar
DROP FUNCTION IF EXISTS upsert_fisiostar_user;
