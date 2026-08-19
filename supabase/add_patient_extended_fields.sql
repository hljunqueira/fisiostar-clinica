-- ==============================================================================
-- EXTENSÃO DE DADOS CADASTRAIS DO PACIENTE & MÓDULO PEDIÁTRICO / RESPONSÁVEL
-- ==============================================================================

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS is_social_name BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS social_name TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS cns TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS profession TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS brief_diagnosis TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS landline_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_preference TEXT DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS allow_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_channels JSONB DEFAULT '{"whatsapp": true, "email": true, "sms": false}',
ADD COLUMN IF NOT EXISTS insurance_card_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_card_expiry DATE,
ADD COLUMN IF NOT EXISTS insurance_card_holder TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil',
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS has_guardian BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_relationship TEXT,
ADD COLUMN IF NOT EXISTS guardian_cpf TEXT,
ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
ADD COLUMN IF NOT EXISTS guardian_email TEXT,
ADD COLUMN IF NOT EXISTS home_care_instructions TEXT,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS referral_doctor TEXT;

-- Índices para otimização de busca
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_guardian_phone ON patients(guardian_phone);
CREATE INDEX IF NOT EXISTS idx_patients_unit_id ON patients(unit_id);
