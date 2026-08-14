SELECT id, email, role, aud, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, banned_until, deleted_at 
FROM auth.users 
WHERE email IN ('admin@fisiostar.com', 'pedro@fisiostar.com');
