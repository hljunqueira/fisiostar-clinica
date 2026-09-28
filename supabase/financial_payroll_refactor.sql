-- Migration: Refatoração do Financeiro, Folha de Pagamento, Vales e Serviços Vinculados aos Profissionais
-- Data: 2026-09-25

-- 1. Campos de Regime e Salário na tabela professionals
ALTER TABLE professionals 
  ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'pj',
  ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clinic_fee_type VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS clinic_fee_value DECIMAL(10,2) DEFAULT 0;

-- 2. Tabela de Serviços e Comissões Vinculadas aos Profissionais
CREATE TABLE IF NOT EXISTS professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  commission_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_professional_services_prof ON professional_services(professional_id);

-- 3. Tabela de Vales e Adiantamentos a Colaboradores
CREATE TABLE IF NOT EXISTS employee_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  advance_date DATE NOT NULL,
  description TEXT,
  payment_method VARCHAR(50) DEFAULT 'pix',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deducted', 'cancelled')),
  deducted_in_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES system_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_advances_prof ON employee_advances(professional_id);
CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON employee_advances(status);
CREATE INDEX IF NOT EXISTS idx_employee_advances_date ON employee_advances(advance_date);

-- 4. Extensão da tabela payments para suportar auditoria detalhada, vales e conferência de folha
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advances_deducted DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clinic_fee_deducted DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_sessions_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audit_details JSONB;

-- 5. Habilitar RLS e Políticas de Acesso
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_advances ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'professional_services' AND policyname = 'professional_services_all_auth'
  ) THEN
    CREATE POLICY professional_services_all_auth ON professional_services FOR ALL TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'employee_advances' AND policyname = 'employee_advances_all_auth'
  ) THEN
    CREATE POLICY employee_advances_all_auth ON employee_advances FOR ALL TO authenticated USING (true);
  END IF;
END $$;
