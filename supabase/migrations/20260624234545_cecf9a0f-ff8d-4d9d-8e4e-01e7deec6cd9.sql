
-- access_codes: restrict view to authenticated users
DROP POLICY IF EXISTS "Anyone can view active codes" ON public.access_codes;
CREATE POLICY "Authenticated users can view active codes"
ON public.access_codes FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_active = true);

-- customer_transactions: restrict view to authenticated users
DROP POLICY IF EXISTS "Everyone can view transactions" ON public.customer_transactions;
CREATE POLICY "Authenticated users can view transactions"
ON public.customer_transactions FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- profiles: restrict view to authenticated users
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- settings: restrict view to authenticated users
DROP POLICY IF EXISTS "Everyone can view settings" ON public.settings;
CREATE POLICY "Authenticated users can view settings"
ON public.settings FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
