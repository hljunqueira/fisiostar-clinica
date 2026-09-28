-- ==============================================================================
-- FisioStar: Sincronização de Secretárias na tabela professionals
-- Garante que secretárias apareçam na folha financeira, tenham salário fixo,
-- possam receber vales (employee_advances) e fechar pagamentos (payments).
-- ==============================================================================

BEGIN;

INSERT INTO public.professionals (id, name, crf, specialty, hourly_rate, color, email, roles, contract_type, base_salary)
VALUES 
  ('1ca84d45-38f1-4c34-9d6d-dc6891f32ede', 'Nairelle Braun Junqueira', 'REC-NAI', 'Recepção & Administrativo', 0, '#8b5cf6', 'nay@fisiostarclinica.com.br', ARRAY['secretary'], 'clt', 1800.00),
  ('39779617-f1d6-4020-8a39-026d863fe761', 'Ariane Secretaria', 'REC-ARIANE', 'Recepção & Administrativo', 0, '#a855f7', 'ariane@fisiostarclinica.com.br', ARRAY['secretary'], 'clt', 1800.00),
  ('74a187a1-20da-4419-8043-2e0348954aea', 'Kelly Secretaria', 'REC-KELLY', 'Recepção & Administrativo', 0, '#c084fc', 'kelly@fisiostarclinica.com.br', ARRAY['secretary'], 'clt', 1800.00),
  ('156a98fe-f74b-43e4-8263-63022c27e747', 'Vitória Secretaria', 'REC-VITORIA', 'Recepção & Administrativo', 0, '#7c3aed', 'vitoria@fisiostarclinica.com.br', ARRAY['secretary'], 'clt', 1800.00)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  crf = EXCLUDED.crf,
  specialty = EXCLUDED.specialty,
  roles = EXCLUDED.roles,
  contract_type = EXCLUDED.contract_type,
  base_salary = EXCLUDED.base_salary,
  updated_at = NOW();

-- Vincular unidades
INSERT INTO public.professional_units (professional_id, unit_id)
VALUES
  ('1ca84d45-38f1-4c34-9d6d-dc6891f32ede', '550e8400-e29b-41d4-a716-446655440012'), -- Nairelle -> Arroio
  ('39779617-f1d6-4020-8a39-026d863fe761', '550e8400-e29b-41d4-a716-446655440011'), -- Ariane -> Araranguá
  ('74a187a1-20da-4419-8043-2e0348954aea', '550e8400-e29b-41d4-a716-446655440012'), -- Kelly -> Arroio
  ('156a98fe-f74b-43e4-8263-63022c27e747', '550e8400-e29b-41d4-a716-446655440011')  -- Vitória -> Araranguá
ON CONFLICT (professional_id, unit_id) DO NOTHING;

COMMIT;
