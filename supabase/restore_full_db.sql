-- ==============================================================================
-- FISIOSTAR CLINIC - COMPREHENSIVE RESTORATION SCRIPT
-- ==============================================================================
-- This script rebuilds the entire database including:
-- 1. All Schemas (Core & Financial)
-- 2. All Migrations (Storage, Notifications, Revenues, Permissions)
-- 3. All RLS Policies & Triggers
-- 4. Initial Seed Data
-- 5. Demo Users (Admin, Nairelle, Dra. Ana Silva)
--
-- Instructions: 
-- 1. Run this in the Supabase SQL Editor (Studio port 3002).
-- 2. Ensure your .env on VPS is configured and containers were restarted with 'down -v'.
-- ==============================================================================

-- 0. CLEANUP (Optional - Uncomment if you want to wipe existing schema first)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'secretary', 'professional');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('Agendada', 'Confirmada', 'Realizada', 'Cancelada', 'Falta');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE patient_status AS ENUM ('Active', 'Inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE announcement_type AS ENUM ('info', 'warning', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE target_role AS ENUM ('all', 'professional', 'secretary');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE week_day AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. CORE TABLES
CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  has_pool BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE unit_operating_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  day week_day NOT NULL,
  is_open BOOLEAN DEFAULT true,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, day)
);

CREATE TABLE unit_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  crf TEXT NOT NULL UNIQUE,
  specialty TEXT NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  color TEXT DEFAULT '#2563EB',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE professional_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, unit_id)
);

CREATE TABLE plan_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  sessions INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  phone TEXT,
  cpf TEXT UNIQUE,
  birth_date DATE,
  address TEXT,
  city TEXT,
  status patient_status DEFAULT 'Active',
  photo_url TEXT,
  last_visit DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patient_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_sessions INTEGER NOT NULL,
  remaining_sessions INTEGER NOT NULL,
  expires_at DATE NOT NULL,
  total_paid DECIMAL(10, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  type TEXT NOT NULL,
  status session_status DEFAULT 'Agendada',
  notes TEXT,
  signed BOOLEAN DEFAULT false,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  avatar_url TEXT,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  custom_permissions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type announcement_type DEFAULT 'info',
  date DATE NOT NULL,
  target_role target_role DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE unit_specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, specialty_id)
);

-- 4. FINANCIAL TABLES
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sessions INTEGER NOT NULL,
  amount_per_session DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP,
  paid_by UUID REFERENCES system_users(id),
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'pix', 'check')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('rent', 'utilities', 'supplies', 'maintenance', 'salaries', 'marketing', 'other')),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP,
  created_by UUID REFERENCES system_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('specialties', 'units', 'professionals', 'plan_templates', 'patients', 'sessions', 'system_users', 'payments', 'expenses', 'revenues')
    LOOP
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- 7. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('patient-photos', 'patient-photos', true), ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING ( bucket_id IN ('avatars', 'patient-photos', 'signatures') );
CREATE POLICY "Authenticated Insert" ON storage.objects FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING ( auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING ( auth.role() = 'authenticated' );

-- 8. INDEXES
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_system_users_email ON system_users(email);
CREATE INDEX idx_system_users_auth ON system_users(auth_user_id);

-- 9. RLS POLICIES (Allow All Authenticated)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY "Allow All Authenticated" ON %I FOR ALL TO authenticated USING (true)', t);
    END LOOP;
END $$;

-- 10. SEED DATA
INSERT INTO specialties (id, name, active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Traumato-Ortopedia', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Hidroterapia', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Pilates', true);

INSERT INTO units (id, name, city, has_pool, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 'FisioStar - Araranguá | Matriz', 'Araranguá', true, true),
  ('550e8400-e29b-41d4-a716-446655440012', 'FisioStar - Arroio | Filial', 'Arroio do Silva', false, true);

INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440021', 'Dra. Ana Silva', '12345-F', 'Traumato-Ortopedia', 80.00, '#2563EB');

INSERT INTO patients (id, name, unit_id, phone, cpf) VALUES
  ('550e8400-e29b-41d4-a716-446655440041', 'Roberto Mendes', '550e8400-e29b-41d4-a716-446655440011', '(48) 99999-1111', '000.111.222-33');

-- 11. DEMO USERS CREATION FUNCTION
CREATE OR REPLACE FUNCTION create_demo_user(
    param_email text, 
    param_password text, 
    param_name text, 
    param_role user_role,
    param_unit uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
    new_user_id uuid;
BEGIN
    SELECT id INTO new_user_id FROM auth.users WHERE email = param_email;
    IF new_user_id IS NULL THEN
        new_user_id := uuid_generate_v4();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token)
        VALUES (new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', param_email, crypt(param_password, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', json_build_object('name', param_name), NOW(), NOW(), '');
        
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
        VALUES (new_user_id, new_user_id, json_build_object('sub', new_user_id, 'email', param_email), 'email', new_user_id, NOW(), NOW());
    END IF;

    INSERT INTO public.system_users (auth_user_id, name, email, role, unit_id)
    VALUES (new_user_id, param_name, param_email, param_role, param_unit)
    ON CONFLICT (email) DO UPDATE SET auth_user_id = new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Executar criação dos usuários demo
SELECT create_demo_user('admin@fisiostar.com', '123456', 'Administrador Demo', 'admin', '550e8400-e29b-41d4-a716-446655440011');
SELECT create_demo_user('nay@fisiostar.com', '123456', 'Nairelle Secretaria', 'secretary', '550e8400-e29b-41d4-a716-446655440011');
SELECT create_demo_user('ana.silva@fisiostar.com', '123456', 'Dra. Ana Silva', 'professional', '550e8400-e29b-41d4-a716-446655440011');

DROP FUNCTION create_demo_user;
