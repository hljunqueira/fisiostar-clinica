-- Seed Specialties
INSERT INTO public.specialties (name, active) VALUES 
('Fisioterapia', true),
('Pilates/LPF', true),
('Quiropraxia', true),
('Drenagem Linfática', true),
('Hidroterapia', true),
('Hidroginástica', true),
('Natação', true)
ON CONFLICT (name) DO NOTHING;
