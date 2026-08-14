-- Inserir Pacientes Demo
INSERT INTO public.patients (id, name, unit_id, phone, cpf, birth_date, status)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440042', 'Maria Oliveira', '550e8400-e29b-41d4-a716-446655440011', '(48) 99888-1122', '123.456.789-01', '1985-05-12', 'Active'),
  ('550e8400-e29b-41d4-a716-446655440043', 'Carlos Eduardo', '550e8400-e29b-41d4-a716-446655440011', '(48) 99777-3344', '987.654.321-02', '1990-08-20', 'Active'),
  ('550e8400-e29b-41d4-a716-446655440044', 'Fernanda Lima', '550e8400-e29b-41d4-a716-446655440012', '(48) 99666-5566', '456.789.123-03', '1992-11-05', 'Active')
ON CONFLICT (id) DO NOTHING;

-- Inserir Sessões Demo para Dr. Pedro Santos
INSERT INTO public.sessions (id, patient_id, professional_id, unit_id, date, time, duration_minutes, type, status, notes, signed)
VALUES 
  (
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440011',
    '2026-08-10',
    '08:00',
    50,
    'Pilates',
    'Realizada',
    'Evolução sem dores pós treino.',
    true
  ),
  (
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440042',
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440011',
    '2026-08-11',
    '09:00',
    50,
    'Pilates',
    'Realizada',
    'Sessão com foco em postura e solo.',
    true
  ),
  (
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440043',
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440011',
    '2026-08-12',
    '10:00',
    50,
    'Pilates',
    'Realizada',
    'Excelente mobilidade torácica.',
    true
  ),
  (
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440044',
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440012',
    '2026-08-14',
    '14:00',
    50,
    'Pilates',
    'Agendada',
    'Sessão agendada na filial Arroio.',
    false
  ),
  (
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440011',
    '2026-08-15',
    '15:00',
    50,
    'Pilates',
    'Agendada',
    'Reavaliação periódica.',
    false
  )
ON CONFLICT (id) DO NOTHING;
