-- Migration: Add custom_permissions to system_users table
-- Run this in Supabase SQL Editor

-- Add custom_permissions column to system_users
ALTER TABLE system_users 
ADD COLUMN IF NOT EXISTS custom_permissions TEXT[] DEFAULT '{}';

-- Create index for performance queries involving permissions (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_system_users_permissions ON system_users USING GIN (custom_permissions);
