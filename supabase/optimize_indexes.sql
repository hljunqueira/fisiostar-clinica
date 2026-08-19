CREATE INDEX IF NOT EXISTS idx_evolutions_patient_id ON patient_evolutions(patient_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_date ON patient_evolutions(date DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_patient_id ON patient_evaluations(patient_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON patient_evaluations(date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);
VACUUM ANALYZE;
