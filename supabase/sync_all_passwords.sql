-- Padronização completa e cirúrgica de auth.users baseada no registro ativo do Pedro
UPDATE auth.users
SET 
    encrypted_password = '$2a$06$xj4fxCWRcb/7E3vT5ruIQ.v2S16QS6SnBo.AR1Cn7hgdbRwzr5P62',
    aud = '',
    role = 'authenticated',
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    phone = NULL,
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
    is_sso_user = COALESCE(is_sso_user, false),
    is_anonymous = COALESCE(is_anonymous, false),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    updated_at = NOW()
WHERE email <> 'admin@fisiostar.com';

-- Para o admin@fisiostar.com, garantir também os mesmos campos sem alterar encrypted_password
UPDATE auth.users
SET 
    aud = '',
    role = 'authenticated',
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    phone = NULL,
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
    is_sso_user = COALESCE(is_sso_user, false),
    is_anonymous = COALESCE(is_anonymous, false),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    updated_at = NOW()
WHERE email = 'admin@fisiostar.com';
