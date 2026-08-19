-- Migration: clinical_templates_schema.sql
-- Adiciona suporte a templates customizados de evolução e avaliação e mapa de dor anatômico

CREATE TABLE IF NOT EXISTS clinical_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('evolution', 'evaluation')),
    category TEXT NOT NULL DEFAULT 'standard' CHECK (category IN ('standard', 'restricted', 'custom')),
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clinical_templates_type ON clinical_templates(type);
CREATE INDEX IF NOT EXISTS idx_clinical_templates_prof ON clinical_templates(professional_id);

-- Adiciona colunas para pontos de dor e dados de templates em patient_evolutions
ALTER TABLE patient_evolutions 
ADD COLUMN IF NOT EXISTS pain_points JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES clinical_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}'::jsonb;

-- Adiciona colunas para pontos de dor, dados de templates e anexos em patient_evaluations
ALTER TABLE patient_evaluations 
ADD COLUMN IF NOT EXISTS pain_points JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES clinical_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Insere template padrão: Evolução Dr Gilmar (com os 10 blocos de checkbox + relato)
INSERT INTO clinical_templates (type, category, title, description, is_system, sections)
VALUES (
    'evolution',
    'standard',
    'Evolução Dr Gilmar',
    'Modelo com 10 condutas com checkbox de ativação e caixas de relato clínico detalhado.',
    true,
    '[
        {"id": "terapia_manual", "title": "Terapia Manual", "type": "checkbox_text", "checked": true, "placeholder": "Descreva as manobras de terapia manual realizadas..."},
        {"id": "eletroterapia", "title": "Eletroterapia", "type": "checkbox_text", "checked": true, "placeholder": "Ex: TENS convencional 100Hz, 20min, região lombar..."},
        {"id": "exercicio_forca", "title": "Exercício de força", "type": "checkbox_text", "checked": true, "placeholder": "Descreva as séries, cargas e repetições..."},
        {"id": "mobilidade", "title": "Mobilidade", "type": "checkbox_text", "checked": true, "placeholder": "Mobilizações articulares e exercícios de ganho de ADM..."},
        {"id": "alongamento", "title": "Alongamento", "type": "checkbox_text", "checked": true, "placeholder": "Alongamentos musculares passivos/ativos..."},
        {"id": "exercicio_aerobico", "title": "Exercício aeróbico", "type": "checkbox_text", "checked": false, "placeholder": "Bicicleta, esteira, tempo e intensidade..."},
        {"id": "apresentacao_paciente", "title": "Apresentação do paciente", "type": "checkbox_text", "checked": true, "placeholder": "Relato de dor ao chegar, queixas recentes..."},
        {"id": "propriocepcao", "title": "Propriocepção", "type": "checkbox_text", "checked": true, "placeholder": "Treino de equilíbrio estático/dinâmico, prancha..."},
        {"id": "exercicio_funcional", "title": "Exercício funcional", "type": "checkbox_text", "checked": true, "placeholder": "Gestos funcionais e esportivos adaptados..."},
        {"id": "final_atendimento", "title": "Final do atendimento", "type": "checkbox_text", "checked": true, "placeholder": "Resposta final do paciente, orientações domiciliares..."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Insere template padrão: Avaliação Dr Gilmar
INSERT INTO clinical_templates (type, category, title, description, is_system, sections)
VALUES (
    'evaluation',
    'standard',
    'Avaliação Dr Gilmar',
    'Avaliação clínica completa com semiologia, exames complementares, goniometria, testes especiais e fotos.',
    true,
    '[
        {"id": "patient_presentation", "title": "APRESENTAÇÃO DO PACIENTE", "type": "textarea", "placeholder": "Queixa principal, história da moléstia atual (HMA) e início dos sintomas..."},
        {"id": "complementary_exams", "title": "EXAMES COMPLEMENTARES", "type": "file_upload", "placeholder": "Laudos de RX, Ressonância, Tomografia e Ultrassom..."},
        {"id": "medications", "title": "USA MEDICAMENTOS?", "type": "text", "placeholder": "Medicamentos em uso contínuo ou recente..."},
        {"id": "inspection_palpation", "title": "INSPEÇÃO/PALPAÇÃO", "type": "textarea", "placeholder": "Edema, calor, rubor, deformidades, pontos gatilho miofasciais..."},
        {"id": "semiology", "title": "SEMIOLOGIA", "type": "textarea", "placeholder": "Sinais vitais e achados semiológicos gerais..."},
        {"id": "active_movements_strength", "title": "MOVIMENTOS ATIVOS / FORÇA MUSCULAR / GONIOMETRIA / FLEXIBILIDADE", "type": "textarea", "placeholder": "Grau de força (0 a 5), amplitude de movimento articular e testes de flexibilidade..."},
        {"id": "passive_movements", "title": "MOVIMENTOS PASSIVOS", "type": "textarea", "placeholder": "Sensação de fim de curso (end-feel), bloqueios e dor ao movimento passivo..."},
        {"id": "functional_tests", "title": "TESTES FUNCIONAIS", "type": "textarea", "placeholder": "Capacidade funcional, transferências e atividades diárias (AVDs)..."},
        {"id": "gait_proprioception", "title": "MARCHA / PROPRIOCEPÇÃO", "type": "textarea", "placeholder": "Padrão de marcha, claudicação, apoio unipodal e equilíbrio..."},
        {"id": "specific_tests", "title": "TESTES ESPECÍFICOS", "type": "textarea", "placeholder": "Testes ortopédicos e neurológicos específicos da região avaliada..."},
        {"id": "pain_assessment", "title": "AVALIAÇÃO DA INTENSIDADE DOR", "type": "pain_map", "placeholder": "Escala EVA e mapa de dor anatômico..."},
        {"id": "functional_diagnosis", "title": "DIAGNÓSTICO CINÉTICO FUNCIONAL", "type": "textarea", "placeholder": "Conclusão diagnóstica fisioterapêutica e objetivos terapêuticos..."},
        {"id": "images", "title": "IMAGENS", "type": "image_upload", "placeholder": "Fotos posturais e registros comparativos do paciente..."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Insere template padrão: Avaliação Pélvica (Restrita)
INSERT INTO clinical_templates (type, category, title, description, is_system, sections)
VALUES (
    'evaluation',
    'restricted',
    'Avaliação Pélvica',
    'Avaliação uroginecológica e assoalho pélvico (Saúde da Mulher / Homem).',
    true,
    '[
        {"id": "pelvic_complaint", "title": "Queixa Uroginecológica", "type": "textarea", "placeholder": "Perda urinária, urgência, dor pélvica, dispareunia..."},
        {"id": "obstetric_history", "title": "História Obstétrica / Cirúrgica", "type": "textarea", "placeholder": "Gestações, partos, cirurgias abdominais e pélvicas..."},
        {"id": "perfect_scale", "title": "Avaliação Muscular do Assoalho Pélvico (Escala PERFECT)", "type": "textarea", "placeholder": "P (Power), E (Endurance), R (Repetitions), F (Fast contractions)..."},
        {"id": "pelvic_diagnosis", "title": "Diagnóstico Cinético-Funcional Pélvico", "type": "textarea", "placeholder": "Incontinência de esforço, bexiga hiperativa, prolapsos..."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;
