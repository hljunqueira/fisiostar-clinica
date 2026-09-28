-- ==============================================================================
-- FisioStar: Atualização de Usuários e Permissões
-- 1. Remover Dra. Ana Silva
-- 2. Dr. Pedro: Admin e Profissional
-- 3. Dr. Wlisses: Admin e Profissional
-- 4. Cadastrar Val do Financeiro (val@fisiostar.com / 123456)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função auxiliar idempotente para cadastrar ou sincronizar usuário no Auth e no system_users
CREATE OR REPLACE FUNCTION upsert_fisiostar_user(
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_role user_role,
    p_unit_id UUID DEFAULT NULL,
    p_custom_permissions TEXT[] DEFAULT NULL
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
            uuid_generate_v4(),
            v_user_id,
            json_build_object('sub', v_user_id::text, 'email', v_clean_email),
            'email',
            v_user_id::text,
            NOW(),
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET 
            encrypted_password = crypt(p_password, gen_salt('bf')),
            raw_user_meta_data = json_build_object('name', p_name),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    INSERT INTO public.system_users (
        auth_user_id,
        name,
        email,
        role,
        unit_id,
        custom_permissions,
        updated_at
    ) VALUES (
        v_user_id,
        p_name,
        v_clean_email,
        p_role,
        p_unit_id,
        p_custom_permissions,
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        unit_id = COALESCE(EXCLUDED.unit_id, public.system_users.unit_id),
        custom_permissions = EXCLUDED.custom_permissions,
        updated_at = NOW();

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    v_unit_ararangua UUID := '550e8400-e29b-41d4-a716-446655440011';
    v_unit_arroio UUID := '550e8400-e29b-41d4-a716-446655440012';
    v_admin_prof_perms TEXT[] := ARRAY[
        'view_dashboard',
        'view_schedule',
        'manage_patients',
        'manage_team',
        'manage_units',
        'view_financials',
        'manage_plans',
        'edit_settings',
        'access_professional_portal',
        'access_internal_chat',
        'manage_chat_channels',
        'manage_rooms',
        'book_rooms',
        'view_rooms',
        'view_audit_logs'
    ];
BEGIN
    -- 1. REMOVER DRA. ANA SILVA (Profissional Demo)
    DELETE FROM professional_services WHERE professional_id IN (
        SELECT id FROM professionals WHERE name ILIKE '%Ana Silva%' OR email = 'ana.silva@fisiostar.com'
    );
    DELETE FROM professional_units WHERE professional_id IN (
        SELECT id FROM professionals WHERE name ILIKE '%Ana Silva%' OR email = 'ana.silva@fisiostar.com'
    );
    DELETE FROM professionals WHERE name ILIKE '%Ana Silva%' OR email = 'ana.silva@fisiostar.com';
    DELETE FROM system_users WHERE email = 'ana.silva@fisiostar.com' OR name ILIKE '%Ana Silva%';
    DELETE FROM auth.users WHERE email = 'ana.silva@fisiostar.com';

    -- 2. DR. PEDRO SANTOS -> ADMIN E PROFESSIONAL
    PERFORM upsert_fisiostar_user(
        'pedro@fisiostar.com',
        '123456',
        'Dr. Pedro Santos',
        'admin',
        v_unit_arroio,
        v_admin_prof_perms
    );

    -- Garantir Dr. Pedro na tabela professionals
    INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, email)
    VALUES ('550e8400-e29b-41d4-a716-446655440024', 'Dr. Pedro Santos', 'CREFITO 18942-F', 'Fisioterapia Traumato-Ortopédica', 100.00, '#0284c7', 'socio', 0.00, 'pedro@fisiostar.com')
    ON CONFLICT (crf) DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        contract_type = 'socio';

    -- 3. DR. WLISSES -> ADMIN E PROFESSIONAL
    PERFORM upsert_fisiostar_user(
        'wlisses@fisiostar.com',
        '123456',
        'Dr. Wlisses',
        'admin',
        v_unit_ararangua,
        v_admin_prof_perms
    );

    -- Garantir Dr. Wlisses na tabela professionals
    INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, email)
    VALUES ('550e8400-e29b-41d4-a716-446655440033', 'Dr. Wlisses', 'CREFITO 38192-F', 'Fisioterapia & Quiropraxia', 85.00, '#6366f1', 'pj', 0.00, 'wlisses@fisiostar.com')
    ON CONFLICT (crf) DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name;

    -- 4. VAL DO FINANCEIRO -> val@fisiostar.com / 123456
    PERFORM upsert_fisiostar_user(
        'val@fisiostar.com',
        '123456',
        'Val - Financeiro',
        'financial',
        v_unit_ararangua,
        ARRAY['view_financial_dashboard', 'view_financials', 'access_internal_chat', 'view_rooms']
    );

END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS upsert_fisiostar_user;
