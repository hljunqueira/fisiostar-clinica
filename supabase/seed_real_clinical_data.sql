-- Seed: Dados Reais das Planilhas Clínicas FisioStar (Setembro 2026)
-- Arquivo: supabase/seed_real_clinical_data.sql

DO $$
DECLARE
  v_matriz_id UUID := '550e8400-e29b-41d4-a716-446655440011';
  v_filial_id UUID := '550e8400-e29b-41d4-a716-446655440012';
  
  v_pedro_id UUID := '550e8400-e29b-41d4-a716-446655440022';
  v_douglas_id UUID := '550e8400-e29b-41d4-a716-446655440025';
  v_marialaura_id UUID := '550e8400-e29b-41d4-a716-446655440026';
  v_gabriel_id UUID := '550e8400-e29b-41d4-a716-446655440027';
  v_jeniffer_id UUID := '550e8400-e29b-41d4-a716-446655440028';

  v_pat_luiz UUID := '660e8400-e29b-41d4-a716-446655440101';
  v_pat_arlete UUID := '660e8400-e29b-41d4-a716-446655440102';
  v_pat_cleusa UUID := '660e8400-e29b-41d4-a716-446655440103';
  v_pat_anaclara UUID := '660e8400-e29b-41d4-a716-446655440104';
  v_pat_julia UUID := '660e8400-e29b-41d4-a716-446655440105';
  v_pat_evinha UUID := '660e8400-e29b-41d4-a716-446655440106';
  v_pat_leonardo UUID := '660e8400-e29b-41d4-a716-446655440107';
  v_pat_francine UUID := '660e8400-e29b-41d4-a716-446655440108';
  v_pat_valerio UUID := '660e8400-e29b-41d4-a716-446655440109';
  v_pat_marli UUID := '660e8400-e29b-41d4-a716-446655440110';
BEGIN

  -- 1. PROFISSIONAIS REAIS
  -- Dr. Pedro (SÓCIO)
  INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, clinic_fee_type, clinic_fee_value)
  VALUES (v_pedro_id, 'Dr. Pedro Santos', 'CREFITO 14892-F', 'Fisioterapia & Sócio-Gestor', 85.00, '#3b82f6', 'socio', 4500.00, 'none', 0.00)
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    hourly_rate = EXCLUDED.hourly_rate,
    contract_type = 'socio',
    base_salary = 4500.00,
    clinic_fee_type = 'none',
    clinic_fee_value = 0.00;

  -- Douglas (Natação / Personal / Avaliações)
  INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, clinic_fee_type, clinic_fee_value)
  VALUES (v_douglas_id, 'Douglas', 'CREFITO 19283-F', 'Natação & Personal Fisio', 60.00, '#0284c7', 'pj', 0.00, 'none', 0.00)
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    hourly_rate = EXCLUDED.hourly_rate,
    contract_type = 'pj',
    base_salary = 0.00;

  -- Dra. Maria Laura (Pilates & Fisioterapia)
  INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, clinic_fee_type, clinic_fee_value)
  VALUES (v_marialaura_id, 'Dra. Maria Laura', 'CREFITO 28471-F', 'Pilates & Fisioterapia', 69.00, '#ec4899', 'pj', 0.00, 'none', 0.00)
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    hourly_rate = EXCLUDED.hourly_rate,
    contract_type = 'pj',
    base_salary = 0.00;

  -- Dr. Gabriel (CLT Traumato-Ortopedia)
  INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, clinic_fee_type, clinic_fee_value)
  VALUES (v_gabriel_id, 'Dr. Gabriel', 'CREFITO 31092-F', 'Fisioterapia Traumato-Ortopédica', 75.00, '#10b981', 'clt', 2800.00, 'none', 0.00)
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    hourly_rate = EXCLUDED.hourly_rate,
    contract_type = 'clt',
    base_salary = 2800.00;

  -- Dra. Jeniffer (Pilates)
  INSERT INTO professionals (id, name, crf, specialty, hourly_rate, color, contract_type, base_salary, clinic_fee_type, clinic_fee_value)
  VALUES (v_jeniffer_id, 'Dra. Jeniffer', 'CREFITO 22910-F', 'Pilates Clínico', 65.00, '#8b5cf6', 'pj', 0.00, 'none', 0.00)
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    hourly_rate = EXCLUDED.hourly_rate,
    contract_type = 'pj',
    base_salary = 0.00;

  -- Vínculo de Unidades para os Profissionais
  DELETE FROM professional_units WHERE professional_id IN (v_pedro_id, v_douglas_id, v_marialaura_id, v_gabriel_id, v_jeniffer_id);
  
  -- Pedro atua em ambas (Matriz e Arroio)
  INSERT INTO professional_units (professional_id, unit_id) VALUES (v_pedro_id, v_matriz_id), (v_pedro_id, v_filial_id);
  -- Douglas atua em Araranguá
  INSERT INTO professional_units (professional_id, unit_id) VALUES (v_douglas_id, v_matriz_id);
  -- Maria Laura em Araranguá
  INSERT INTO professional_units (professional_id, unit_id) VALUES (v_marialaura_id, v_matriz_id);
  -- Gabriel em Araranguá
  INSERT INTO professional_units (professional_id, unit_id) VALUES (v_gabriel_id, v_matriz_id);
  -- Jeniffer em Araranguá
  INSERT INTO professional_units (professional_id, unit_id) VALUES (v_jeniffer_id, v_matriz_id);

  -- 2. SERVIÇOS & COMISSÕES VINCULADAS
  DELETE FROM professional_services WHERE professional_id IN (v_pedro_id, v_douglas_id, v_marialaura_id, v_gabriel_id, v_jeniffer_id);

  -- Pedro: 50% em Fisioterapia e Pilates
  INSERT INTO professional_services (professional_id, service_name, commission_type, commission_value) VALUES
    (v_pedro_id, 'Fisioterapia', 'percentage', 50.00),
    (v_pedro_id, 'Fisioterapia Geral', 'percentage', 50.00),
    (v_pedro_id, 'Pilates Clínico', 'percentage', 50.00);

  -- Douglas: Natação 50%, Personal 50%, Avaliação R$ 45 fixo
  INSERT INTO professional_services (professional_id, service_name, commission_type, commission_value) VALUES
    (v_douglas_id, 'Natação', 'percentage', 50.00),
    (v_douglas_id, 'Personal Fisio', 'percentage', 50.00),
    (v_douglas_id, 'Avaliação Física', 'fixed', 45.00);

  -- Maria Laura: Pilates 50%, Fisioterapia 45%, RPG 50%
  INSERT INTO professional_services (professional_id, service_name, commission_type, commission_value) VALUES
    (v_marialaura_id, 'Pilates Clínico', 'percentage', 50.00),
    (v_marialaura_id, 'Pilates Solo', 'percentage', 50.00),
    (v_marialaura_id, 'Fisioterapia', 'percentage', 45.00),
    (v_marialaura_id, 'Fisioterapia Geral', 'percentage', 45.00);

  -- Gabriel: 25% comissão ortopédica (é CLT com salário base 2.800)
  INSERT INTO professional_services (professional_id, service_name, commission_type, commission_value) VALUES
    (v_gabriel_id, 'Fisioterapia Traumato-Ortopédica', 'percentage', 25.00),
    (v_gabriel_id, 'Fisioterapia Geral', 'percentage', 25.00);

  -- Jeniffer: Pilates 50%
  INSERT INTO professional_services (professional_id, service_name, commission_type, commission_value) VALUES
    (v_jeniffer_id, 'Pilates Clínico', 'percentage', 50.00);


  -- 3. PACIENTES REAIS DAS PLANILHAS
  INSERT INTO patients (id, name, unit_id, phone, status) VALUES
    (v_pat_luiz, 'LUIZ CORNELIO FRANCISCO', v_filial_id, '(48) 99123-0101', 'Active'),
    (v_pat_arlete, 'ARLETE NUNES FRANCISCO', v_filial_id, '(48) 99123-0102', 'Active'),
    (v_pat_cleusa, 'CLEUSA MARIA ROCHA', v_filial_id, '(48) 99123-0103', 'Active'),
    (v_pat_anaclara, 'Ana Clara da Silva', v_matriz_id, '(48) 99123-0104', 'Active'),
    (v_pat_julia, 'Julia da Silva', v_matriz_id, '(48) 99123-0105', 'Active'),
    (v_pat_evinha, 'Evinha', v_matriz_id, '(48) 99123-0106', 'Active'),
    (v_pat_leonardo, 'Leonardo de Souza', v_matriz_id, '(48) 99123-0107', 'Active'),
    (v_pat_francine, 'Francine Bittencourt', v_filial_id, '(48) 99123-0108', 'Active'),
    (v_pat_valerio, 'Valerio Vieira Destro', v_filial_id, '(48) 99123-0109', 'Active'),
    (v_pat_marli, 'Antonia Marli Piazza', v_filial_id, '(48) 99123-0110', 'Active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, unit_id = EXCLUDED.unit_id;


  -- 4. VALES REAIS (Conforme Planilhas Excel)
  -- Limpar vales de teste anteriores desse mês para não duplicar
  DELETE FROM employee_advances WHERE advance_date >= '2026-09-01' AND advance_date <= '2026-09-30';

  -- Vales do Douglas: R$ 40 + R$ 35 + R$ 250 + R$ 1060 = R$ 1.385,00
  INSERT INTO employee_advances (professional_id, unit_id, amount, advance_date, description, payment_method, status) VALUES
    (v_douglas_id, v_matriz_id, 40.00, '2026-09-03', '3/4 Figurinha e Pequenas Despesas', 'cash', 'pending'),
    (v_douglas_id, v_matriz_id, 35.00, '2026-09-10', '01/02 Vale Dia dos Pais', 'cash', 'pending'),
    (v_douglas_id, v_matriz_id, 250.00, '2026-09-15', 'PIX Adiantamento Quinzenal', 'pix', 'pending'),
    (v_douglas_id, v_matriz_id, 1060.00, '2026-09-20', 'Desconto Mensal / Adiantamento Salarial', 'bank_transfer', 'pending');

  -- Vales da Maria Laura: Total R$ 432,18
  INSERT INTO employee_advances (professional_id, unit_id, amount, advance_date, description, payment_method, status) VALUES
    (v_marialaura_id, v_matriz_id, 150.00, '2026-09-08', 'Vale Farmácia e Material', 'pix', 'pending'),
    (v_marialaura_id, v_matriz_id, 282.18, '2026-09-18', 'Vale Combustível e Insumos', 'pix', 'pending');

  -- Vales do Pedro: R$ 47,00
  INSERT INTO employee_advances (professional_id, unit_id, amount, advance_date, description, payment_method, status) VALUES
    (v_pedro_id, v_filial_id, 47.00, '2026-09-21', 'Despesa Operacional Arroio', 'cash', 'pending');

  -- Vales do Gabriel: R$ 350,00
  INSERT INTO employee_advances (professional_id, unit_id, amount, advance_date, description, payment_method, status) VALUES
    (v_gabriel_id, v_matriz_id, 350.00, '2026-09-12', 'Adiantamento Salarial', 'pix', 'pending');


  -- 5. SESSÕES REALIZADAS DE SETEMBRO/2026 (Com destaque para esta semana: 21 a 25/09/2026)
  -- Limpar sessões geradas de teste no mês para popular de forma consistente
  DELETE FROM sessions WHERE date >= '2026-09-01' AND date <= '2026-09-30';

  -- SESSÕES DO DOUGLAS (Natação & Personal)
  INSERT INTO sessions (patient_id, professional_id, unit_id, date, time, status, type, price, signed) VALUES
    (v_pat_anaclara, v_douglas_id, v_matriz_id, '2026-09-04', '09:00', 'Realizada', 'Natação', 190.00, true),
    (v_pat_anaclara, v_douglas_id, v_matriz_id, '2026-09-11', '09:00', 'Realizada', 'Natação', 190.00, true),
    (v_pat_anaclara, v_douglas_id, v_matriz_id, '2026-09-18', '09:00', 'Realizada', 'Natação', 190.00, true),
    -- Esta semana:
    (v_pat_anaclara, v_douglas_id, v_matriz_id, '2026-09-22', '09:00', 'Realizada', 'Natação', 190.00, true),
    (v_pat_anaclara, v_douglas_id, v_matriz_id, '2026-09-24', '09:00', 'Realizada', 'Natação', 190.00, true),
    (v_pat_julia, v_douglas_id, v_matriz_id, '2026-09-21', '10:00', 'Realizada', 'Personal Fisio', 220.00, true),
    (v_pat_julia, v_douglas_id, v_matriz_id, '2026-09-23', '10:00', 'Realizada', 'Personal Fisio', 220.00, true),
    (v_pat_julia, v_douglas_id, v_matriz_id, '2026-09-25', '10:00', 'Realizada', 'Personal Fisio', 220.00, true),
    (v_pat_evinha, v_douglas_id, v_matriz_id, '2026-09-25', '14:00', 'Realizada', 'Avaliação Física', 90.00, true);

  -- SESSÕES DA MARIA LAURA (Pilates & Fisioterapia)
  INSERT INTO sessions (patient_id, professional_id, unit_id, date, time, status, type, price, signed) VALUES
    (v_pat_evinha, v_marialaura_id, v_matriz_id, '2026-09-03', '14:00', 'Realizada', 'Pilates Clínico', 298.00, true),
    (v_pat_evinha, v_marialaura_id, v_matriz_id, '2026-09-10', '14:00', 'Realizada', 'Pilates Clínico', 298.00, true),
    (v_pat_evinha, v_marialaura_id, v_matriz_id, '2026-09-17', '14:00', 'Realizada', 'Pilates Clínico', 298.00, true),
    -- Esta semana:
    (v_pat_evinha, v_marialaura_id, v_matriz_id, '2026-09-22', '14:00', 'Realizada', 'Pilates Clínico', 298.00, true),
    (v_pat_evinha, v_marialaura_id, v_matriz_id, '2026-09-24', '14:00', 'Realizada', 'Pilates Clínico', 298.00, true),
    (v_pat_leonardo, v_marialaura_id, v_matriz_id, '2026-09-21', '15:00', 'Realizada', 'Fisioterapia', 69.00, true),
    (v_pat_leonardo, v_marialaura_id, v_matriz_id, '2026-09-23', '15:00', 'Realizada', 'Fisioterapia', 69.00, true),
    (v_pat_leonardo, v_marialaura_id, v_matriz_id, '2026-09-25', '15:00', 'Realizada', 'Fisioterapia', 69.00, true);

  -- SESSÕES DO DR. PEDRO (Sócio - Arroio)
  INSERT INTO sessions (patient_id, professional_id, unit_id, date, time, status, type, price, signed) VALUES
    (v_pat_luiz, v_pedro_id, v_filial_id, '2026-09-02', '08:00', 'Realizada', 'Fisioterapia', 250.00, true),
    (v_pat_arlete, v_pedro_id, v_filial_id, '2026-09-02', '09:00', 'Realizada', 'Fisioterapia', 250.00, true),
    (v_pat_cleusa, v_pedro_id, v_filial_id, '2026-09-09', '10:00', 'Realizada', 'Fisioterapia', 250.00, true),
    (v_pat_francine, v_pedro_id, v_filial_id, '2026-09-16', '11:00', 'Realizada', 'Fisioterapia', 150.00, true),
    -- Esta semana:
    (v_pat_luiz, v_pedro_id, v_filial_id, '2026-09-21', '08:00', 'Realizada', 'Fisioterapia', 250.00, true),
    (v_pat_arlete, v_pedro_id, v_filial_id, '2026-09-22', '09:00', 'Realizada', 'Fisioterapia', 250.00, true),
    (v_pat_valerio, v_pedro_id, v_filial_id, '2026-09-23', '10:00', 'Realizada', 'Fisioterapia', 250.00, true),
    (v_pat_marli, v_pedro_id, v_filial_id, '2026-09-24', '11:00', 'Realizada', 'Fisioterapia', 150.00, true),
    (v_pat_francine, v_pedro_id, v_filial_id, '2026-09-25', '14:00', 'Realizada', 'Fisioterapia', 150.00, true);

  -- SESSÕES DO DR. GABRIEL (CLT Traumato-Ortopedia - Araranguá)
  INSERT INTO sessions (patient_id, professional_id, unit_id, date, time, status, type, price, signed) VALUES
    (v_pat_julia, v_gabriel_id, v_matriz_id, '2026-09-08', '16:00', 'Realizada', 'Fisioterapia Traumato-Ortopédica', 120.00, true),
    (v_pat_julia, v_gabriel_id, v_matriz_id, '2026-09-15', '16:00', 'Realizada', 'Fisioterapia Traumato-Ortopédica', 120.00, true),
    -- Esta semana:
    (v_pat_julia, v_gabriel_id, v_matriz_id, '2026-09-22', '16:00', 'Realizada', 'Fisioterapia Traumato-Ortopédica', 120.00, true),
    (v_pat_julia, v_gabriel_id, v_matriz_id, '2026-09-24', '16:00', 'Realizada', 'Fisioterapia Traumato-Ortopédica', 120.00, true),
    (v_pat_leonardo, v_gabriel_id, v_matriz_id, '2026-09-25', '17:00', 'Realizada', 'Fisioterapia Traumato-Ortopédica', 120.00, true);

  -- SESSÕES DA DRA. JENIFFER (Pilates)
  INSERT INTO sessions (patient_id, professional_id, unit_id, date, time, status, type, price, signed) VALUES
    (v_pat_anaclara, v_jeniffer_id, v_matriz_id, '2026-09-21', '11:00', 'Realizada', 'Pilates Clínico', 100.00, true),
    (v_pat_anaclara, v_jeniffer_id, v_matriz_id, '2026-09-23', '11:00', 'Realizada', 'Pilates Clínico', 100.00, true),
    (v_pat_anaclara, v_jeniffer_id, v_matriz_id, '2026-09-25', '11:00', 'Realizada', 'Pilates Clínico', 100.00, true);


  -- 6. RECEITAS OPERACIONAIS DO CAIXA (SETEMBRO/2026)
  DELETE FROM revenues WHERE date >= '2026-09-01' AND date <= '2026-09-30';

  INSERT INTO revenues (unit_id, description, amount, date, payment_method) VALUES
    (v_filial_id, 'Pacote 8A Paciente Luiz Cornélio', 250.00, '2026-09-02', 'sumup'),
    (v_filial_id, 'Pacote 8A Paciente Arlete Nunes', 250.00, '2026-09-02', 'sumup'),
    (v_filial_id, 'Pacote 8A Paciente Cleusa Maria', 250.00, '2026-09-09', 'sumup'),
    (v_filial_id, 'Sessões Fisioterapia Paciente Darli Domingos', 150.00, '2026-09-14', 'cash'),
    (v_filial_id, 'Pacote 8A Paciente Valerio Destro', 250.00, '2026-09-20', 'bank_transfer'),
    (v_filial_id, 'Movimentação Caixa Semanal Arroio do Silva', 6840.00, '2026-09-24', 'pix'),
    
    (v_matriz_id, 'Mensalidades Studio Pilates Araranguá', 8450.00, '2026-09-10', 'pix'),
    (v_matriz_id, 'Pacotes Natação Hidro & Reabilitação', 5200.00, '2026-09-15', 'pix'),
    (v_matriz_id, 'Atendimentos Fisioterapia Ortopédica', 3480.00, '2026-09-22', 'credit_card'),
    (v_matriz_id, 'Avaliações Clínicas e Físicas', 1820.00, '2026-09-25', 'debit_card');


  -- 7. DESPESAS OPERACIONAIS (SETEMBRO/2026)
  DELETE FROM expenses WHERE expense_date >= '2026-09-01' AND expense_date <= '2026-09-30';

  INSERT INTO expenses (unit_id, category, description, amount, expense_date, paid) VALUES
    (v_matriz_id, 'rent', 'Aluguel Imóvel Matriz Araranguá', 3800.00, '2026-09-05', true),
    (v_filial_id, 'rent', 'Aluguel Imóvel Filial Arroio do Silva', 2200.00, '2026-09-05', true),
    (v_matriz_id, 'utilities', 'Energia Elétrica Celesc - Matriz', 740.00, '2026-09-10', true),
    (v_filial_id, 'utilities', 'Energia Elétrica Celesc - Filial', 420.00, '2026-09-10', true),
    (v_matriz_id, 'utilities', 'Internet Fibra Óptica', 250.00, '2026-09-12', true),
    (v_matriz_id, 'supplies', 'Eletrodos, Gel Condutor e Faixas Elásticas', 520.00, '2026-09-15', true),
    (v_matriz_id, 'maintenance', 'Manutenção Aparelhos de Pilates & Filtro Piscina', 490.00, '2026-09-18', true),
    (v_filial_id, 'other', 'Taxas Maquininhas SumUp e Cartão (1,45% / 3,51%)', 680.00, '2026-09-24', true);

END $$;
