-- ==============================================================================
-- FisioStar v2.0 - Migration: Módulo Clínico, Segurança, RLS Granular e Contratos
-- ==============================================================================

-- 0. EXTENSÕES, ENUMS E COLUNAS PRELIMINARES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Expandir enum de papéis caso necessário
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'financial';

-- Garantir colunas necessárias antes das funções
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- 1. FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- Obter papel do usuário conectado via auth.uid()
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM system_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verificar se o usuário conectado é Administrador, Gerente ou Super Admin
CREATE OR REPLACE FUNCTION is_clinic_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM system_users 
    WHERE auth_user_id = auth.uid() 
    AND role::text IN ('admin', 'manager', 'super_admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obter o ID do profissional vinculado ao auth.uid()
CREATE OR REPLACE FUNCTION get_current_professional_id()
RETURNS UUID AS $$
  SELECT p.id FROM professionals p
  JOIN system_users u ON (
    (p.email IS NOT NULL AND LOWER(TRIM(u.email)) = LOWER(TRIM(p.email))) 
    OR LOWER(TRIM(u.name)) = LOWER(TRIM(p.name))
  )
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;



-- 2. TABELA DE CONVÊNIOS E PARCERIAS (agreements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  ans_code TEXT,
  grace_period_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. AVALIAÇÕES CLÍNICAS / ANAMNESES (patient_evaluations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  specialty TEXT DEFAULT 'Fisioterapia',
  chief_complaint TEXT NOT NULL,
  history_current_illness TEXT,
  past_medical_history TEXT,
  lifestyle_habits TEXT,
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  physical_examination TEXT,
  clinical_diagnosis TEXT,
  treatment_goals TEXT,
  treatment_plan TEXT,
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. EVOLUÇÕES DIÁRIAS DE ATENDIMENTO (patient_evolutions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_evolutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  conduct TEXT NOT NULL,
  patient_response TEXT,
  next_steps TEXT,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.1 TRILHA DE AUDITORIA DE EVOLUÇÕES (patient_evolutions_audit)
CREATE TABLE IF NOT EXISTS patient_evolutions_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evolution_id UUID REFERENCES patient_evolutions(id) ON DELETE CASCADE,
  modified_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  old_conduct TEXT,
  new_conduct TEXT,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 TRIGGER DE IMUTABILIDADE CLÍNICA (Bloqueio após 24h)
CREATE OR REPLACE FUNCTION enforce_evolution_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.created_at < NOW() - INTERVAL '24 hours' THEN
      RAISE EXCEPTION 'Conformidade de Prontuário: Não é permitido alterar ou excluir uma evolução clínica após 24 horas da sua criação.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evolution_immutability ON patient_evolutions;
CREATE TRIGGER trg_evolution_immutability
BEFORE UPDATE OR DELETE ON patient_evolutions
FOR EACH ROW EXECUTE FUNCTION enforce_evolution_immutability();


-- 5. MODELOS DE CONTRATOS E TERMOS (contract_templates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'service_agreement', 'tcle', 'image_rights', 'custom'
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. CONTRATOS DOS PACIENTES COM HASH SHA-256 (patient_contracts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES patient_plans(id) ON DELETE SET NULL,
  template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'signed', 'cancelled'
  document_hash TEXT, -- Hash criptográfico SHA-256
  signed_at TIMESTAMPTZ,
  signed_ip TEXT,
  signed_user_agent TEXT,
  signature_url TEXT,
  signer_name TEXT,
  signer_cpf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 7. ATUALIZAÇÃO EM TABELAS EXISTENTES
-- ------------------------------------------------------------------------------
-- Convênios em Pacientes e Sessões
ALTER TABLE patients ADD COLUMN IF NOT EXISTS agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL;

-- Colaboradores: Suporte a PF/PJ, Documento, Dados Bancários/PIX e Múltiplos Papéis
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'PF',
ADD COLUMN IF NOT EXISTS document TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_agency TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{"professional"}';

-- Planos: Renovação Automática, Alertas de Encerramento e Comissões
ALTER TABLE plan_templates 
ADD COLUMN IF NOT EXISTS auto_renew TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS alert_days_before INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS financial_launch_type TEXT DEFAULT 'total',
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10, 2) DEFAULT 0;


-- 8. PREVENÇÃO DE CONFLITOS DE HORÁRIO / DUPLO AGENDAMENTO (ÍNDICE PARCIAL)
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_prevent_double_booking 
ON sessions (professional_id, date, time) 
WHERE (status != 'Cancelada');

CREATE INDEX IF NOT EXISTS idx_evaluations_patient ON patient_evaluations(patient_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON patient_evaluations(date);
CREATE INDEX IF NOT EXISTS idx_evolutions_patient ON patient_evolutions(patient_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_session ON patient_evolutions(session_id);
CREATE INDEX IF NOT EXISTS idx_contracts_patient ON patient_contracts(patient_id);


-- 9. ROW LEVEL SECURITY (RLS) GRANULAR POR PAPEL
-- ------------------------------------------------------------------------------
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_evolutions_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_contracts ENABLE ROW LEVEL SECURITY;

-- 9.1 Políticas para Convênios (agreements)
DROP POLICY IF EXISTS "Leitura de convenios para autenticados" ON agreements;
CREATE POLICY "Leitura de convenios para autenticados" 
ON agreements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin gerencia convenios" ON agreements;
CREATE POLICY "Admin gerencia convenios" 
ON agreements FOR ALL TO authenticated 
USING (is_clinic_admin()) 
WITH CHECK (is_clinic_admin());

-- 9.2 Políticas para Avaliações (patient_evaluations)
DROP POLICY IF EXISTS "Leitura de avaliacoes" ON patient_evaluations;
CREATE POLICY "Leitura de avaliacoes" 
ON patient_evaluations FOR SELECT TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Profissional ou Admin cria avaliacoes" ON patient_evaluations;
CREATE POLICY "Profissional ou Admin cria avaliacoes" 
ON patient_evaluations FOR INSERT TO authenticated 
WITH CHECK (is_clinic_admin() OR professional_id = get_current_professional_id() OR professional_id IS NULL);

DROP POLICY IF EXISTS "Profissional ou Admin atualiza avaliacoes" ON patient_evaluations;
CREATE POLICY "Profissional ou Admin atualiza avaliacoes" 
ON patient_evaluations FOR UPDATE TO authenticated 
USING (is_clinic_admin() OR professional_id = get_current_professional_id());

-- 9.3 Políticas para Evoluções (patient_evolutions) - SECRETÁRIA NÃO EDITA
DROP POLICY IF EXISTS "Leitura de evolucoes clinicas" ON patient_evolutions;
CREATE POLICY "Leitura de evolucoes clinicas" 
ON patient_evolutions FOR SELECT TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Apenas profissional autor ou admin insere evolucao" ON patient_evolutions;
CREATE POLICY "Apenas profissional autor ou admin insere evolucao" 
ON patient_evolutions FOR INSERT TO authenticated 
WITH CHECK (is_clinic_admin() OR professional_id = get_current_professional_id() OR professional_id IS NULL);

DROP POLICY IF EXISTS "Apenas profissional autor ou admin altera evolucao" ON patient_evolutions;
CREATE POLICY "Apenas profissional autor ou admin altera evolucao" 
ON patient_evolutions FOR UPDATE TO authenticated 
USING (is_clinic_admin() OR professional_id = get_current_professional_id());

DROP POLICY IF EXISTS "Apenas admin pode excluir evolucao dentro da janela" ON patient_evolutions;
CREATE POLICY "Apenas admin pode excluir evolucao dentro da janela" 
ON patient_evolutions FOR DELETE TO authenticated 
USING (is_clinic_admin());

-- 9.4 Políticas para Auditoria de Evoluções (patient_evolutions_audit)
DROP POLICY IF EXISTS "Leitura de auditoria para admin e profissional" ON patient_evolutions_audit;
CREATE POLICY "Leitura de auditoria para admin e profissional" 
ON patient_evolutions_audit FOR SELECT TO authenticated 
USING (is_clinic_admin() OR get_current_user_role() = 'professional');

DROP POLICY IF EXISTS "Insercao de auditoria" ON patient_evolutions_audit;
CREATE POLICY "Insercao de auditoria" 
ON patient_evolutions_audit FOR INSERT TO authenticated 
WITH CHECK (true);

-- 9.5 Políticas para Modelos de Contratos (contract_templates)
DROP POLICY IF EXISTS "Leitura de modelos de contrato" ON contract_templates;
CREATE POLICY "Leitura de modelos de contrato" 
ON contract_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin gerencia modelos de contrato" ON contract_templates;
CREATE POLICY "Admin gerencia modelos de contrato" 
ON contract_templates FOR ALL TO authenticated 
USING (is_clinic_admin()) WITH CHECK (is_clinic_admin());

-- 9.6 Políticas para Contratos de Pacientes (patient_contracts)
DROP POLICY IF EXISTS "Leitura de contratos de pacientes" ON patient_contracts;
CREATE POLICY "Leitura de contratos de pacientes" 
ON patient_contracts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin e secretaria gerenciam contratos" ON patient_contracts;
CREATE POLICY "Admin e secretaria gerenciam contratos" 
ON patient_contracts FOR ALL TO authenticated 
USING (is_clinic_admin() OR get_current_user_role() = 'secretary')
WITH CHECK (is_clinic_admin() OR get_current_user_role() = 'secretary');


-- 10. PERMISSÕES PARA ROLES SUPABASE (anon, authenticated, service_role)
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Notificar PostgREST para recarregar o schema imediatamente
NOTIFY pgrst, 'reload schema';

