-- Create table for role menu permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  menu_item text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, menu_item)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view permissions"
  ON public.role_permissions
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage permissions"
  ON public.role_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert default permissions
INSERT INTO public.role_permissions (role, menu_item, enabled) VALUES
  -- Admin permissions (all enabled)
  ('admin', 'dashboard', true),
  ('admin', 'pos', true),
  ('admin', 'inventory', true),
  ('admin', 'customers', true),
  ('admin', 'reports', true),
  ('admin', 'settings', true),
  ('admin', 'users', true),
  ('admin', 'access_codes', true),
  -- Cashier permissions (limited)
  ('cashier', 'dashboard', true),
  ('cashier', 'pos', true),
  ('cashier', 'inventory', true),
  ('cashier', 'customers', true),
  ('cashier', 'reports', true),
  ('cashier', 'settings', false),
  ('cashier', 'users', false),
  ('cashier', 'access_codes', false)
ON CONFLICT (role, menu_item) DO NOTHING;