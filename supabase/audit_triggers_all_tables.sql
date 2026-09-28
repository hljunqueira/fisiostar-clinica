-- ==============================================================================
-- FISIOSTAR CLINICA - AUDITORIA AUTOMÁTICA COMPLETA DE TODAS AS TABELAS
-- ==============================================================================

-- 1. Atualizar estrutura da tabela audit_logs para suportar auditoria detalhada de campos
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changed_fields JSONB;

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module, created_at DESC);

-- Permissões RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read audit_logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert audit_logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Função de Trigger Genérica de Auditoria
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := NULL;
    v_user_name TEXT := 'Sistema';
    v_user_role TEXT := 'admin';
    v_module TEXT;
    v_action TEXT;
    v_details TEXT;
    v_old_json JSONB := NULL;
    v_new_json JSONB := NULL;
    v_changed_fields JSONB := '{}'::JSONB;
    v_record_id TEXT := NULL;
    k TEXT;
BEGIN
    -- 1. Identificar usuário autenticado no Supabase Auth
    BEGIN
        v_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- 2. Resolver nome e perfil do usuário a partir de system_users
    IF v_user_id IS NOT NULL THEN
        SELECT name, role INTO v_user_name, v_user_role
        FROM public.system_users
        WHERE id = v_user_id OR auth_user_id = v_user_id OR email = (
            SELECT email FROM auth.users WHERE id = v_user_id LIMIT 1
        )
        LIMIT 1;

        -- Fallback para auth.users metadata se não encontrado em system_users
        IF v_user_name IS NULL THEN
            SELECT 
                COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', email),
                COALESCE(raw_user_meta_data->>'role', 'admin')
            INTO v_user_name, v_user_role
            FROM auth.users
            WHERE id = v_user_id
            LIMIT 1;
        END IF;
    END IF;

    IF v_user_name IS NULL OR v_user_name = '' THEN
        v_user_name := 'Sistema / Admin';
        v_user_role := 'admin';
    END IF;

    -- 3. Mapear Módulo a partir da tabela
    CASE TG_TABLE_NAME
        WHEN 'patients' THEN v_module := 'PATIENTS';
        WHEN 'patient_evaluations' THEN v_module := 'PATIENTS';
        WHEN 'patient_evolutions' THEN v_module := 'PATIENTS';
        WHEN 'patient_contracts' THEN v_module := 'PATIENTS';
        WHEN 'patient_plans' THEN v_module := 'PLANS';
        WHEN 'sessions' THEN v_module := 'SCHEDULE';
        WHEN 'rooms' THEN v_module := 'ROOMS';
        WHEN 'room_reservations' THEN v_module := 'ROOMS';
        WHEN 'expenses' THEN v_module := 'FINANCIAL';
        WHEN 'revenues' THEN v_module := 'FINANCIAL';
        WHEN 'payments' THEN v_module := 'FINANCIAL';
        WHEN 'employee_advances' THEN v_module := 'FINANCIAL';
        WHEN 'agreements' THEN v_module := 'AGREEMENTS';
        WHEN 'system_users' THEN v_module := 'AUTH';
        WHEN 'units' THEN v_module := 'UNITS';
        WHEN 'unit_operating_hours' THEN v_module := 'UNITS';
        WHEN 'unit_holidays' THEN v_module := 'UNITS';
        WHEN 'professionals' THEN v_module := 'TEAM';
        WHEN 'professional_services' THEN v_module := 'TEAM';
        WHEN 'plan_templates' THEN v_module := 'PLANS';
        WHEN 'clinical_templates' THEN v_module := 'CLINICAL';
        WHEN 'announcements' THEN v_module := 'ANNOUNCEMENTS';
        ELSE v_module := UPPER(TG_TABLE_NAME);
    END CASE;

    -- 4. Processar operação (INSERT, UPDATE, DELETE)
    IF TG_OP = 'INSERT' THEN
        v_action := 'Criou registro em ' || TG_TABLE_NAME;
        v_new_json := to_jsonb(NEW) - 'password' - 'password_hash' - 'token';
        v_record_id := COALESCE(v_new_json->>'id', '');
        v_details := 'Novo registro inserido em ' || TG_TABLE_NAME || ' (ID: ' || v_record_id || ')';

    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'Atualizou registro em ' || TG_TABLE_NAME;
        v_old_json := to_jsonb(OLD) - 'password' - 'password_hash' - 'token';
        v_new_json := to_jsonb(NEW) - 'password' - 'password_hash' - 'token';
        v_record_id := COALESCE(v_new_json->>'id', v_old_json->>'id', '');

        -- Identificar cada campo alterado com valor anterior e novo
        FOR k IN SELECT jsonb_object_keys(v_new_json)
        LOOP
            IF k NOT IN ('updated_at', 'created_at') AND (v_old_json->k IS DISTINCT FROM v_new_json->k) THEN
                v_changed_fields := jsonb_set(
                    v_changed_fields,
                    ARRAY[k],
                    jsonb_build_object('old', v_old_json->k, 'new', v_new_json->k)
                );
            END IF;
        END LOOP;

        -- Se nenhuma alteração relevante ocorreu (ex: apenas timestamp interno), não gera log
        IF v_changed_fields = '{}'::JSONB THEN
            RETURN NEW;
        END IF;

        v_details := 'Campos alterados em ' || TG_TABLE_NAME || ': ' || (
            SELECT string_agg(key, ', ') FROM jsonb_object_keys(v_changed_fields) AS key
        );

    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'Excluiu registro em ' || TG_TABLE_NAME;
        v_old_json := to_jsonb(OLD) - 'password' - 'password_hash' - 'token';
        v_record_id := COALESCE(v_old_json->>'id', '');
        v_details := 'Registro removido de ' || TG_TABLE_NAME || ' (ID: ' || v_record_id || ')';
    END IF;

    -- 5. Inserir registro na tabela de logs de auditoria
    INSERT INTO public.audit_logs (
        user_id,
        user_name,
        user_role,
        action,
        module,
        table_name,
        record_id,
        old_data,
        new_data,
        changed_fields,
        details,
        created_at
    ) VALUES (
        v_user_id,
        v_user_name,
        v_user_role,
        v_action,
        v_module,
        TG_TABLE_NAME,
        v_record_id,
        v_old_json,
        v_new_json,
        v_changed_fields,
        jsonb_build_object(
            'message', v_details,
            'summary', v_action || ' (ID: ' || COALESCE(v_record_id, '') || ')',
            'changed_fields', v_changed_fields
        ),
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback de segurança: falhas no log nunca devem travar transações clínicas essenciais
    RAISE WARNING 'Falha ao registrar audit log na tabela %: %', TG_TABLE_NAME, SQLERRM;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicar os Triggers em todas as tabelas de negócio do sistema
DO $$
DECLARE
    t TEXT;
    target_tables TEXT[] := ARRAY[
        'patients',
        'sessions',
        'system_users',
        'units',
        'unit_operating_hours',
        'unit_holidays',
        'agreements',
        'rooms',
        'room_reservations',
        'expenses',
        'revenues',
        'payments',
        'employee_advances',
        'professionals',
        'professional_services',
        'plan_templates',
        'patient_plans',
        'patient_contracts',
        'clinical_templates',
        'patient_evaluations',
        'patient_evolutions',
        'announcements'
    ];
BEGIN
    FOREACH t IN ARRAY target_tables
    LOOP
        -- Verificar se a tabela existe antes de anexar o trigger
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;', t, t);
            EXECUTE format('
                CREATE TRIGGER trg_audit_%I
                AFTER INSERT OR UPDATE OR DELETE ON public.%I
                FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
            ', t, t);
            RAISE NOTICE 'Trigger de auditoria criado com sucesso para: %', t;
        END IF;
    END LOOP;
END;
$$;
