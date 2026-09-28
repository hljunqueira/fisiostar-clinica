-- Migração oficial de e-mails de @fisiostar.com para o domínio oficial @fisiostarclinica.com.br
BEGIN;

-- 1. Atualizar auth.users
UPDATE auth.users
SET email = LOWER(REPLACE(email, '@fisiostar.com', '@fisiostarclinica.com.br')),
    raw_user_meta_data = CASE 
        WHEN raw_user_meta_data IS NOT NULL THEN REPLACE(raw_user_meta_data::text, '@fisiostar.com', '@fisiostarclinica.com.br')::jsonb 
        ELSE raw_user_meta_data 
    END,
    updated_at = NOW()
WHERE email LIKE '%@fisiostar.com';

-- 2. Atualizar auth.identities
UPDATE auth.identities
SET identity_data = jsonb_set(
      identity_data, 
      '{email}', 
      to_jsonb(LOWER(REPLACE(identity_data->>'email', '@fisiostar.com', '@fisiostarclinica.com.br')))
    ),
    updated_at = NOW()
WHERE identity_data->>'email' LIKE '%@fisiostar.com';

-- 3. Atualizar public.system_users
UPDATE public.system_users
SET email = LOWER(REPLACE(email, '@fisiostar.com', '@fisiostarclinica.com.br')),
    updated_at = NOW()
WHERE email LIKE '%@fisiostar.com';

-- 4. Garantir suporte@fisiostarclinica.com.br em public.system_users
INSERT INTO public.system_users (id, auth_user_id, name, email, role, created_at, updated_at)
VALUES (
    '7f49c585-9b76-4cd1-9c59-9323bba68907',
    '7f49c585-9b76-4cd1-9c59-9323bba68907',
    'Suporte Técnico FisioStar',
    'suporte@fisiostarclinica.com.br',
    'secretary',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET email = 'suporte@fisiostarclinica.com.br',
    updated_at = NOW();

-- 5. Atualizar public.professionals
UPDATE public.professionals
SET email = LOWER(REPLACE(email, '@fisiostar.com', '@fisiostarclinica.com.br')),
    updated_at = NOW()
WHERE email LIKE '%@fisiostar.com';

COMMIT;
