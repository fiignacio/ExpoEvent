-- Crear tabla para códigos de acceso
CREATE TABLE public.access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  role app_role NOT NULL,
  user_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Todos pueden ver códigos activos (para login)
CREATE POLICY "Anyone can view active codes"
ON public.access_codes
FOR SELECT
USING (is_active = true);

-- Solo admins pueden gestionar códigos
CREATE POLICY "Only admins can insert codes"
ON public.access_codes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update codes"
ON public.access_codes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete codes"
ON public.access_codes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Función para autenticar con código
CREATE OR REPLACE FUNCTION public.authenticate_with_code(_code text)
RETURNS TABLE (
  user_id uuid,
  role app_role,
  user_name text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Generar email único basado en el código
  v_email := 'code_' || _code || '@sistema.local';
  
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
$$;