-- Migration: Add payment tracking to patient_plans table
-- This allows tracking when patients pay for their treatment plans

-- Add payment-related columns to patient_plans
ALTER TABLE patient_plans 
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

-- Create revenues table for tracking all income
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_plan_id UUID REFERENCES patient_plans(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL, -- 'patient_plan', 'session', 'other'
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  revenue_date DATE NOT NULL,
  payment_method VARCHAR(20), -- 'pix', 'cash', 'credit_card', 'debit_card', 'bank_transfer'
  received BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ,
  created_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_revenues_unit ON revenues(unit_id);
CREATE INDEX IF NOT EXISTS idx_revenues_patient ON revenues(patient_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(revenue_date);

-- Enable RLS
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated read access" ON revenues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write access" ON revenues FOR ALL TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_revenues_updated_at BEFORE UPDATE ON revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
