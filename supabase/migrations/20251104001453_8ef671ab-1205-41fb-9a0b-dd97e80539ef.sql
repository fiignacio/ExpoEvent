-- Update RLS policies for products table to restrict modifications to admins only
DROP POLICY IF EXISTS "Todos pueden actualizar productos" ON public.products;
DROP POLICY IF EXISTS "Todos pueden crear productos" ON public.products;
DROP POLICY IF EXISTS "Todos pueden eliminar productos" ON public.products;

-- Cashiers and admins can view products
CREATE POLICY "Everyone can view products"
  ON public.products FOR SELECT
  USING (true);

-- Only admins can modify products
CREATE POLICY "Only admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update products"
  ON public.products FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete products"
  ON public.products FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for settings table to restrict modifications to admins only
DROP POLICY IF EXISTS "Todos pueden actualizar configuraciones" ON public.settings;
DROP POLICY IF EXISTS "Todos pueden crear configuraciones" ON public.settings;

-- Everyone can view settings
CREATE POLICY "Everyone can view settings"
  ON public.settings FOR SELECT
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Only admins can update settings"
  ON public.settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert settings"
  ON public.settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));