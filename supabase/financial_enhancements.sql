-- Update sessions package progress and late cancellations
UPDATE sessions SET package_session_number = 3, package_total_sessions = 8 WHERE patient_id = '660e8400-e29b-41d4-a716-446655440101';
UPDATE sessions SET package_session_number = 2, package_total_sessions = 4 WHERE patient_id = '660e8400-e29b-41d4-a716-446655440105';
UPDATE sessions SET package_session_number = 4, package_total_sessions = 8 WHERE patient_id = '660e8400-e29b-41d4-a716-446655440106';
UPDATE sessions SET package_session_number = 5, package_total_sessions = 10 WHERE patient_id = '660e8400-e29b-41d4-a716-446655440107';

UPDATE sessions SET is_late_cancellation = true WHERE patient_id = '660e8400-e29b-41d4-a716-446655440101' AND date = '2026-09-21';
UPDATE sessions SET is_late_cancellation = true WHERE patient_id = '660e8400-e29b-41d4-a716-446655440106' AND date = '2026-09-24';
