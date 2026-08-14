-- FisioStar Clinic Management System - Database Schema
-- Run this script in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'secretary', 'professional');
CREATE TYPE session_status AS ENUM ('Agendada', 'Confirmada', 'Realizada', 'Cancelada', 'Falta');
CREATE TYPE patient_status AS ENUM ('Active', 'Inactive');
CREATE TYPE announcement_type AS ENUM ('info', 'warning', 'urgent');
CREATE TYPE target_role AS ENUM ('all', 'professional', 'secretary');
CREATE TYPE week_day AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

-- =====================================================
-- TABLES
-- =====================================================

-- Specialties
CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  has_pool BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unit Operating Hours
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

-- Unit Holidays
CREATE TABLE unit_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Professionals
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  crf TEXT NOT NULL UNIQUE,
  specialty TEXT NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  color TEXT DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Professional Units (Many-to-Many)
CREATE TABLE professional_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, unit_id)
);

-- Plan Templates
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

-- Patients
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

-- Patient Plans
CREATE TABLE patient_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_sessions INTEGER NOT NULL,
  remaining_sessions INTEGER NOT NULL,
  expires_at DATE NOT NULL,
  total_paid DECIMAL(10, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_date TIMESTAMPTZ,
  payment_method VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30, -- Duration in minutes for calendar visualization
  type TEXT NOT NULL,
  status session_status DEFAULT 'Agendada',
  notes TEXT,
  signed BOOLEAN DEFAULT false,
  signature_url TEXT,
  is_outside_plan BOOLEAN DEFAULT false,
  price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Users
CREATE TABLE system_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE, -- Links to Supabase Auth
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  avatar_url TEXT,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL, -- Associated unit
  custom_permissions TEXT[], -- Custom permission overrides
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
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

-- Unit Specialties (Many-to-Many)
CREATE TABLE unit_specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, specialty_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_professional ON sessions(professional_id);
CREATE INDEX idx_sessions_patient ON sessions(patient_id);
CREATE INDEX idx_sessions_unit ON sessions(unit_id);
CREATE INDEX idx_patients_unit ON patients(unit_id);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_system_users_email ON system_users(email);
CREATE INDEX idx_system_users_auth ON system_users(auth_user_id);

-- =====================================================
-- TRIGGERS (Auto update timestamps)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_specialties_updated_at BEFORE UPDATE ON specialties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_templates_updated_at BEFORE UPDATE ON plan_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_users_updated_at BEFORE UPDATE ON system_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users to read all data
-- TODO: Implement role-based policies later

CREATE POLICY "Allow authenticated read access" ON specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON specialties FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON units FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON unit_operating_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON unit_operating_hours FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON unit_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON unit_holidays FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON professionals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON professionals FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON professional_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON professional_units FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON plan_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON plan_templates FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON patients FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON patient_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON patient_plans FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON sessions FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON system_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON system_users FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON announcements FOR ALL TO authenticated USING (true);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON audit_logs FOR ALL TO authenticated USING (true);
