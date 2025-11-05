-- Function to synchronize user role on login based on access code role
CREATE OR REPLACE FUNCTION public.sync_role_on_login(_email text, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find user_id by email in profiles
  SELECT user_id INTO v_user_id
  FROM public.profiles
  WHERE email = _email
  LIMIT 1;

  -- If no user found, exit gracefully
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Sanity check
  IF _role IS NULL THEN
    RETURN;
  END IF;

  -- Replace any existing role rows for this user
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- Assign the desired role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, _role);
END;
$$;

-- Ensure authenticated users can call this RPC
GRANT EXECUTE ON FUNCTION public.sync_role_on_login(text, app_role) TO authenticated;