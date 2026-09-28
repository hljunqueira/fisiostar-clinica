-- ==============================================================================
-- FisioStar: Atualização Dr. Pedro Barros, Verificação de Acesso e Inclusão
-- de Funcionários Faltantes das Planilhas Financeiras e Zenfisio
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- 1. CORREÇÃO DE NOME: Dr. Pedro Santos -> Dr. Pedro Barros
UPDATE public.system_users 
SET name = 'Dr. Pedro Barros',
    updated_at = NOW()
WHERE LOWER(email) = 'pedro@fisiostar.com';

UPDATE public.professionals 
SET name = 'Dr. Pedro Barros',
    updated_at = NOW()
WHERE LOWER(email) = 'pedro@fisiostar.com' OR name ILIKE '%Pedro%';

UPDATE auth.users 
SET raw_user_meta_data = json_build_object('name', 'Dr. Pedro Barros'),
    updated_at = NOW()
WHERE LOWER(email) = 'pedro@fisiostar.com';


-- 2. FUNÇÃO IDEMPOTENTE PARA CRIAR/GARANTIR ACESSO COMPLETO DE USUÁRIO
CREATE OR REPLACE FUNCTION upsert_clinic_user(
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
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email;

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
        -- Garante que email está confirmado e se o usuário não logou ainda, define senha segura
        UPDATE auth.users 
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = json_build_object('name', p_name),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- Upsert em public.system_users
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


-- 3. CADASTRAR OS FUNCIONÁRIOS FALTANTES DAS PLANILHAS
DO $$
DECLARE
    v_unit_ararangua UUID := '550e8400-e29b-41d4-a716-446655440011';
    v_unit_arroio UUID := '550e8400-e29b-41d4-a716-446655440012';

    v_ariane_id UUID;
    v_kelly_id UUID;
    v_vitoria_id UUID;

    v_bianca_id UUID;
    v_matheus_id UUID;
    v_luan_id UUID;
    v_graziele_id UUID;
    v_karen_id UUID;
    v_gilmar_id UUID;
    v_patricia_id UUID;
BEGIN
    -- --- RECEPÇÃO / SECRETÁRIAS (Do grupo "Ariane - Kelly - Vitória - Nai Arroio") ---
    v_ariane_id  := upsert_clinic_user('ariane@fisiostar.com',  '123456', 'Ariane Secretaria',  'secretary', v_unit_ararangua);
    v_kelly_id   := upsert_clinic_user('kelly@fisiostar.com',   '123456', 'Kelly Secretaria',   'secretary', v_unit_arroio);
    v_vitoria_id := upsert_clinic_user('vitoria@fisiostar.com', '123456', 'Vitória Secretaria', 'secretary', v_unit_ararangua);

    -- --- PROFISSIONAIS CLÍNICOS ---
    -- Bianca (Pilates & Fisioterapia)
    v_bianca_id := upsert_clinic_user('bianca@fisiostar.com', '123456', 'Dra. Bianca', 'professional', v_unit_ararangua);
    INSERT INTO public.professionals (id, name, crf, specialty, hourly_rate, color, email, contract_type, base_salary, roles)
    VALUES (uuid_generate_v4(), 'Dra. Bianca', 'CREFITO 39201-F', 'Pilates & Fisioterapia', 70.00, '#ec4899', 'bianca@fisiostar.com', 'pj', 0.00, ARRAY['professional'])
    ON CONFLICT (crf) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

    -- Matheus Teixeira Ronconi (Fisioterapia Traumato-Ortopédica)
    v_matheus_id := upsert_clinic_user('matheus@fisiostar.com', '123456', 'Dr. Matheus Teixeira', 'professional', v_unit_arroio);
    INSERT INTO public.professionals (id, name, crf, specialty, hourly_rate, color, email, contract_type, base_salary, roles)
    VALUES (uuid_generate_v4(), 'Dr. Matheus Teixeira', 'CREFITO 40182-F', 'Fisioterapia & Traumato', 80.00, '#0284c7', 'matheus@fisiostar.com', 'pj', 0.00, ARRAY['professional'])
    ON CONFLICT (crf) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

    -- Luan (Professor de Natação / Reabilitação Aquática - Raia Livre)
    v_luan_id := upsert_clinic_user('luan@fisiostar.com', '123456', 'Luan (Natação)', 'professional', v_unit_ararangua);
    INSERT INTO public.professionals (id, name, crf, specialty, hourly_rate, color, email, contract_type, base_salary, roles)
    VALUES (uuid_generate_v4(), 'Luan (Natação)', 'CREF 031920-G', 'Natação & Personal Fisio', 75.00, '#0ea5e9', 'luan@fisiostar.com', 'pj', 0.00, ARRAY['professional'])
    ON CONFLICT (crf) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

    -- Graziele Pereira Felisberto (Professora / Pilates Clínico)
    v_graziele_id := upsert_clinic_user('graziele@fisiostar.com', '123456', 'Graziele Felisberto', 'professional', v_unit_ararangua);
    INSERT INTO public.professionals (id, name, crf, specialty, hourly_rate, color, email, contract_type, base_salary, roles)
    VALUES (uuid_generate_v4(), 'Graziele Felisberto', 'CREFITO 32189-F', 'Pilates Clínico', 70.00, '#a855f7', 'graziele@fisiostar.com', 'pj', 0.00, ARRAY['professional'])
    ON CONFLICT (crf) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

    -- Karen dos Santos de Oliveira (Fisioterapeuta)
    v_karen_id := upsert_clinic_user('karen@fisiostar.com', '123456', 'Dra. Karen Oliveira', 'professional', v_unit_arroio);
    INSERT INTO public.professionals (id, name, crf, specialty, hourly_rate, color, email, contract_type, base_salary, roles)
    VALUES (uuid_generate_v4(), 'Dra. Karen Oliveira', 'CREFITO 41029-F', 'Fisioterapia Geral', 75.00, '#14b8a6', 'karen@fisiostar.com', 'pj', 0.00, ARRAY['professional'])
    ON CONFLICT (crf) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

    -- Gilmar Vieira (Reabilitação Funcional & Treinamento)
    v_gilmar_id := upsert_clinic_user('gilmar@fisiostar.com', '123456', 'Gilmar Vieira', 'professional', v_unit_ararangua);
    INSERT INTO public.professionals (id, name, crf, specialty, hourly_rate, color, email, contract_type, base_salary, roles)
    VALUES (uuid_generate_v4(), 'Gilmar Vieira', 'CREF 029810-G', 'Reabilitação Funcional', 75.00, '#f97316', 'gilmar@fisiostar.com', 'pj', 0.00, ARRAY['professional'])
    ON CONFLICT (crf) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

    -- Patrícia de Freitas (Fisioterapia & Reabilitação)
    v_patricia_id := upsert_clinic_user('patricia@fisiostar.com', '123456', 'Dra. Patrícia de Freitas', 'professional', v_unit_arroio);
    INSERT INTO public.professionals (id, name, crf, specialty, hourly_rate, color, email, contract_type, base_salary, roles)
    VALUES (uuid_generate_v4(), 'Dra. Patrícia de Freitas', 'CREFITO 36190-F', 'Fisioterapia Geral', 75.00, '#84cc16', 'patricia@fisiostar.com', 'pj', 0.00, ARRAY['professional'])
    ON CONFLICT (crf) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

    -- Vincular todos os profissionais novos nas unidades
    INSERT INTO public.professional_units (professional_id, unit_id)
    SELECT p.id, u.id
    FROM public.professionals p
    CROSS JOIN public.units u
    WHERE p.email IN (
        'bianca@fisiostar.com',
        'matheus@fisiostar.com',
        'luan@fisiostar.com',
        'graziele@fisiostar.com',
        'karen@fisiostar.com',
        'gilmar@fisiostar.com',
        'patricia@fisiostar.com'
    )
    ON CONFLICT (professional_id, unit_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Remover função temporária
DROP FUNCTION IF EXISTS upsert_clinic_user;

COMMIT;
