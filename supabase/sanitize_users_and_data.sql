-- ==============================================================================
-- FisioStar: Saneamento de Usuários, Permissões e Limpeza de Dados Mock
-- ==============================================================================

BEGIN;

-- 1. Ajustar role e permissões do usuário financeiro@fisiostar.com
UPDATE system_users
SET role = 'financial',
    custom_permissions = ARRAY['view_financial_dashboard', 'view_financials', 'access_internal_chat', 'view_rooms'],
    updated_at = NOW()
WHERE LOWER(email) = 'financeiro@fisiostar.com';

-- 2. Limpar permissão 'access_professional_portal' dos administradores puros
-- (Acesso agora é exclusivo para profissionais, e administradores que atendem
--  como Pedro/Wlisses possuem o botão rápido 'Meu Atendimento Clínico' no perfil)
UPDATE system_users
SET custom_permissions = array_remove(custom_permissions, 'access_professional_portal'),
    updated_at = NOW()
WHERE role IN ('admin', 'super_admin');

-- 3. Inserir Dr. Gabriel na tabela de profissionais caso ainda não esteja
INSERT INTO professionals (
    id,
    name,
    crf,
    specialty,
    hourly_rate,
    color,
    email,
    contract_type,
    base_salary,
    clinic_fee_type,
    clinic_fee_value,
    roles
)
VALUES (
    '550e8400-e29b-41d4-a716-446655440034',
    'Dr. Gabriel',
    'CREFITO 35192-F',
    'Fisioterapia Geral',
    80.00,
    '#3B82F6',
    'gabriel@fisiostar.com',
    'clt',
    3200.00,
    'none',
    0,
    ARRAY['professional']
)
ON CONFLICT (crf) DO UPDATE
SET email = EXCLUDED.email,
    name = EXCLUDED.name;

-- Vincular Dr. Gabriel às unidades Matriz e Filial
INSERT INTO professional_units (professional_id, unit_id)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440011'),
    ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440012')
ON CONFLICT (professional_id, unit_id) DO NOTHING;

-- 4. Excluir dados dos 4 pacientes de teste legados
-- IDs:
-- Roberto Mendes: 550e8400-e29b-41d4-a716-446655440041
-- Maria Oliveira: 550e8400-e29b-41d4-a716-446655440042
-- Carlos Eduardo: 550e8400-e29b-41d4-a716-446655440043
-- Fernanda Lima:  550e8400-e29b-41d4-a716-446655440044

DELETE FROM patient_evolutions 
WHERE patient_id IN (
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440042',
    '550e8400-e29b-41d4-a716-446655440043',
    '550e8400-e29b-41d4-a716-446655440044'
);

DELETE FROM patient_evaluations 
WHERE patient_id IN (
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440042',
    '550e8400-e29b-41d4-a716-446655440043',
    '550e8400-e29b-41d4-a716-446655440044'
);

DELETE FROM sessions 
WHERE patient_id IN (
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440042',
    '550e8400-e29b-41d4-a716-446655440043',
    '550e8400-e29b-41d4-a716-446655440044'
);

DELETE FROM patient_plans 
WHERE patient_id IN (
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440042',
    '550e8400-e29b-41d4-a716-446655440043',
    '550e8400-e29b-41d4-a716-446655440044'
);

DELETE FROM patients 
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440042',
    '550e8400-e29b-41d4-a716-446655440043',
    '550e8400-e29b-41d4-a716-446655440044'
);

COMMIT;
