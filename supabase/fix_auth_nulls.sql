-- FIX: "Scan error on column index 8, name "email_change": converting NULL to string is unsupported"
-- Esse erro acontece porque o GoTrue (Auth) espera uma string vazia '' em vez de NULL.

UPDATE auth.users 
SET email_change = '' 
WHERE email_change IS NULL;

UPDATE auth.users 
SET email_change_token_new = '' 
WHERE email_change_token_new IS NULL;

UPDATE auth.users 
SET recovery_token = '' 
WHERE recovery_token IS NULL;

UPDATE auth.users 
SET confirmation_token = '' 
WHERE confirmation_token IS NULL;

-- Garante que futuros inserts também usem vazio
ALTER TABLE auth.users ALTER COLUMN email_change SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN email_change_token_new SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN recovery_token SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN confirmation_token SET DEFAULT '';
