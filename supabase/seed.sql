-- FisioStar Clinic Management System - Seed Data
-- Run this AFTER schema.sql

-- Insert Specialties
INSERT INTO specialties (id, name, active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Traumato-Ortopedia', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Hidroterapia', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Pilates', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Neurológica', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Geriátrica', true);

-- Insert Units
INSERT INTO units (id, name, city, has_pool, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 'FisioStar - Araranguá | Matriz', 'Araranguá', true, true),
  ('550e8400-e29b-41d4-a716-446655440012', 'FisioStar - Arroio | Filial', 'Arroio do Silva', false, true);

-- Insert Unit Operating Hours (Matriz - Araranguá)
INSERT INTO unit_operating_hours (unit_id, day, is_open, start_time, end_time) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 'monday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440011', 'tuesday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440011', 'wednesday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440011', 'thursday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440011', 'friday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440011', 'saturday', true, '08:00', '12:00'),
  ('550e8400-e29b-41d4-a716-446655440011', 'sunday', false, '00:00', '00:00');

-- Insert Unit Operating Hours (Filial - Arroio)
INSERT INTO unit_operating_hours (unit_id, day, is_open, start_time, end_time) VALUES
  ('550e8400-e29b-41d4-a716-446655440012', 'monday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440012', 'tuesday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440012', 'wednesday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440012', 'thursday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440012', 'friday', true, '08:00', '18:00'),
  ('550e8400-e29b-41d4-a716-446655440012', 'saturday', true, '08:00', '12:00'),
  ('550e8400-e29b-41d4-a716-446655440012', 'sunday', false, '00:00', '00:00');

-- Insert Holidays
INSERT INTO unit_holidays (unit_id, date, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', '2024-05-01', 'Dia do Trabalhador');

-- Insert Professionals
INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440021', 'Dra. Ana Silva', '12345-F', 'Traumato-Ortopedia', 80.00, '#2563EB'),
  ('550e8400-e29b-41d4-a716-446655440022', 'Dr. Carlos Souza', '67890-F', 'Hidroterapia', 95.00, '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440023', 'Dra. Beatriz Lima', '54321-F', 'Pilates', 85.00, '#F97316');

-- Link Professionals to Units
INSERT INTO professional_units (professional_id, unit_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011'),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440012'),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440011'),
  ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440011');

-- Insert Plan Templates
INSERT INTO plan_templates (id, name, specialty_id, sessions, price, description, active) VALUES
  ('550e8400-e29b-41d4-a716-446655440031', 'Reabilitação Intensiva', '550e8400-e29b-41d4-a716-446655440001', 10, 850.00, 'Pacote focado em recuperação pós-operatória.', true),
  ('550e8400-e29b-41d4-a716-446655440032', 'Pilates Mensal (2x)', '550e8400-e29b-41d4-a716-446655440003', 8, 320.00, 'Manutenção e fortalecimento.', true),
  ('550e8400-e29b-41d4-a716-446655440033', 'Hidroterapia Avulsa', '550e8400-e29b-41d4-a716-446655440002', 1, 95.00, 'Sessão única na piscina térmica.', true);

-- Insert Patients
INSERT INTO patients (id, name, unit_id, phone, cpf, birth_date, address, city, status, photo_url, last_visit) VALUES
  ('550e8400-e29b-41d4-a716-446655440041', 'Roberto Mendes', '550e8400-e29b-41d4-a716-446655440011', '(48) 99999-1111', '000.111.222-33', '1985-04-12', 'Av. Sete de Setembro, 100', 'Araranguá', 'Active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', '2024-05-18'),
  ('550e8400-e29b-41d4-a716-446655440042', 'Fernanda Oliveira', '550e8400-e29b-41d4-a716-446655440011', '(48) 99999-2222', '999.888.777-66', '1992-08-25', 'Rua das Flores, 50', 'Araranguá', 'Active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', '2024-05-20'),
  ('550e8400-e29b-41d4-a716-446655440043', 'João da Silva', '550e8400-e29b-41d4-a716-446655440012', '(48) 98888-3333', '111.222.333-44', '1978-01-10', 'Av. Beira Mar, 500', 'Arroio do Silva', 'Inactive', NULL, '2024-04-09');

-- Insert Patient Plans
INSERT INTO patient_plans (patient_id, name, total_sessions, remaining_sessions, expires_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440041', 'Reabilitação Intensiva', 10, 4, '2024-06-30'),
  ('550e8400-e29b-41d4-a716-446655440042', 'Pilates Mensal', 8, 7, '2024-06-15'),
  ('550e8400-e29b-41d4-a716-446655440043', 'Pós-Cirúrgico', 5, 0, '2024-04-10');

-- Insert Sessions (using today's date)
INSERT INTO sessions (id, patient_id, professional_id, unit_id, date, time, type, status, signed) VALUES
  ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440011', CURRENT_DATE, '09:00', 'Hidroterapia', 'Confirmada', true),
  ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440011', CURRENT_DATE, '10:00', 'Pilates', 'Agendada', false),
  ('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', CURRENT_DATE, '14:00', 'Traumato', 'Realizada', false),
  ('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440012', CURRENT_DATE, '15:30', 'Avaliação', 'Falta', false);

-- Insert System Users (these will need to be linked to Supabase Auth users manually)
INSERT INTO system_users (id, name, email, role, avatar_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440061', 'Mariana Costa', 'admin@fisiostar.com', 'admin', NULL),
  ('550e8400-e29b-41d4-a716-446655440062', 'Julia Atendimento', 'julia@fisiostar.com', 'secretary', NULL),
  ('550e8400-e29b-41d4-a716-446655440063', 'Dra. Ana Silva', 'ana.silva@fisiostar.com', 'professional', NULL);

-- Insert Announcements
INSERT INTO announcements (title, message, type, date, target_role) VALUES
  ('Reunião de Equipe', 'Sexta-feira (24/05) às 13:00 na sala de reuniões principal. Pauta: Novos protocolos de atendimento.', 'info', '2024-05-20', 'all'),
  ('Manutenção Piscina', 'A piscina da unidade Matriz estará fechada para manutenção no dia 25/05.', 'warning', '2024-05-21', 'all'),
  ('Evoluções Pendentes', 'Favor regularizar todas as evoluções de pacientes até o final do dia.', 'urgent', '2024-05-22', 'professional');
