-- Set exact working bcrypt hash for password '123456'
UPDATE auth.users 
SET encrypted_password = '$2a$06$0nIqOzk0sWiuONHoYyx3g.95vWYl3XB.9vTjxXC.PzeNpeR/mBO2e'
WHERE email IN ('pedro@fisiostar.com', 'ana.silva@fisiostar.com', 'admin@fisiostar.com', 'nay@fisiostar.com');
