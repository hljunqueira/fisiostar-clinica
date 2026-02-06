-- Migration: Add unit_id to system_users table
-- Run this in Supabase SQL Editor

-- Add unit_id column to system_users
ALTER TABLE system_users 
ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_system_users_unit ON system_users(unit_id);

-- Set default unit for existing users (assign to first unit)
UPDATE system_users 
SET unit_id = (SELECT id FROM units LIMIT 1)
WHERE unit_id IS NULL;
