-- Update authenticate_with_code function to use UUID instead of code in email
CREATE OR REPLACE FUNCTION public.authenticate_with_code(_code text)
 RETURNS TABLE(user_id uuid, role app_role, user_name text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code_data RECORD;
  v_user_id uuid;
  v_email text;
BEGIN
  -- Buscar el código
  SELECT * INTO v_code_data
  FROM public.access_codes
  WHERE code = _code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código inválido o inactivo';
  END IF;
  
  -- Generar email único basado en el UUID del código (no el código mismo)
  v_email := 'user_' || REPLACE(v_code_data.id::text, '-', '') || '@pos.internal';
  
  -- Buscar si ya existe un usuario con este email
  SELECT p.user_id INTO v_user_id
  FROM public.profiles p
  WHERE p.email = v_email;
  
  -- Actualizar última vez usado
  UPDATE public.access_codes
  SET last_used_at = now()
  WHERE code = _code;
  
  -- Retornar datos
  RETURN QUERY
  SELECT 
    v_user_id,
    v_code_data.role,
    v_code_data.user_name,
    v_email;
END;
$function$;