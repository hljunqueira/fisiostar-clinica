-- FIX: Move 'Nay' to Arroio Unit
-- Update 'unit_id' for user 'nay@fisiostar.com' to 'FisioStar - Arroio | Filial'

DO $$
DECLARE
    v_unit_id UUID;
BEGIN
    -- Get Arroio Unit ID
    SELECT id INTO v_unit_id FROM public.units WHERE name LIKE '%Arroio%';

    -- Update System User
    UPDATE public.system_users
    SET unit_id = v_unit_id
    WHERE email = 'nay@fisiostar.com';
    
    RAISE NOTICE 'Moved Nay to Unit %', v_unit_id;
END $$;
