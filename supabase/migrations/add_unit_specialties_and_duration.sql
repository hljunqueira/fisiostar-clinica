-- =====================================================
-- Migration: Add unit_specialties, duration_minutes, and sync schema
-- Date: 2026-02-06
-- Description: 
--   1. Create unit_specialties table (Many-to-Many units <-> specialties)
--   2. Add duration_minutes to sessions
--   3. Sync schema with actual database state
-- =====================================================

-- 1. Create Unit Specialties table (Many-to-Many)
CREATE TABLE IF NOT EXISTS unit_specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, specialty_id)
);

-- Enable RLS and policies for unit_specialties
ALTER TABLE unit_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access" ON unit_specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON unit_specialties FOR ALL TO authenticated USING (true);

-- 2. Add duration_minutes to sessions (default 30 minutes)
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_unit_specialties_unit ON unit_specialties(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_specialties_specialty ON unit_specialties(specialty_id);

-- =====================================================
-- Note: The following columns already exist in the database
-- but are documented here for schema consistency:
-- 
-- system_users.unit_id UUID REFERENCES units(id) ON DELETE SET NULL
-- system_users.custom_permissions TEXT[]
-- =====================================================
