-- FIX: Link Professional to Unit
-- Insert 'Dra. Ana Silva' into 'professional_units' for 'FisioStar - Araranguá | Matriz'

DO $$
DECLARE
    v_prof_id UUID;
    v_unit_id UUID;
BEGIN
    -- Get Professional ID
    SELECT id INTO v_prof_id FROM public.professionals WHERE name = 'Dra. Ana Silva';
    
    -- Get Unit ID
    SELECT id INTO v_unit_id FROM public.units WHERE name LIKE 'FisioStar - Araranguá%';

    -- Insert if not exists
    IF v_prof_id IS NOT NULL AND v_unit_id IS NOT NULL THEN
        INSERT INTO public.professional_units (professional_id, unit_id)
        VALUES (v_prof_id, v_unit_id)
        ON CONFLICT (professional_id, unit_id) DO NOTHING;
        
        RAISE NOTICE 'Linked Dra. Ana Silva to Unit %', v_unit_id;
    ELSE
        RAISE WARNING 'Professional or Unit not found. Check names.';
    END IF;
END $$;
