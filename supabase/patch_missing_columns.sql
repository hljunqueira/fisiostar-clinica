-- ==============================================================================
-- PATCH: ADD MISSING COLUMNS
-- ==============================================================================
-- This script adds columns that are present in the application code but missing
-- from the restored database schema.

-- 1. Sessions Table - Add 'is_outside_plan' and 'price'
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS is_outside_plan BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

-- 2. Revenues Table - Add missing financial columns
ALTER TABLE revenues 
ADD COLUMN IF NOT EXISTS patient_plan_id UUID REFERENCES patient_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('patient_plan', 'session', 'other')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES system_users(id),
ADD COLUMN IF NOT EXISTS received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- 3. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_revenues_category ON revenues(category);
CREATE INDEX IF NOT EXISTS idx_revenues_patient_plan ON revenues(patient_plan_id);

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE 'Patch applied successfully: Missing columns added to sessions and revenues.';
END $$;
