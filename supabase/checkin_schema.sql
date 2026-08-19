-- Schema do Módulo de Check-in e Biometria Facial (FisioStar)

CREATE TABLE IF NOT EXISTS checkin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    unit_id VARCHAR(50) NOT NULL,
    modality VARCHAR(100) NOT NULL,
    method VARCHAR(30) NOT NULL DEFAULT 'idface', -- 'idface', 'totem_facial', 'totem_cpf', 'manual_reception'
    status VARCHAR(30) NOT NULL DEFAULT 'success', -- 'success', 'no_session', 'no_balance', 'duplicate'
    remaining_sessions_before INT,
    remaining_sessions_after INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_checkin_patient ON checkin_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_checkin_unit ON checkin_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_checkin_created ON checkin_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE checkin_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura de checkin_logs para autenticados" ON checkin_logs;
CREATE POLICY "Permitir leitura de checkin_logs para autenticados"
    ON checkin_logs FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Permitir inserção de checkin_logs" ON checkin_logs;
CREATE POLICY "Permitir inserção de checkin_logs"
    ON checkin_logs FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de checkin_logs" ON checkin_logs;
CREATE POLICY "Permitir atualização de checkin_logs"
    ON checkin_logs FOR UPDATE
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão de checkin_logs" ON checkin_logs;
CREATE POLICY "Permitir exclusão de checkin_logs"
    ON checkin_logs FOR DELETE
    TO authenticated, anon
    USING (true);
