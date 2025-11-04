-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Insert test users
-- Admin user: username=admin, password=admin123
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@sistema.local',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Administrador"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (user_id, full_name, email, username) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Administrador',
  'admin@sistema.local',
  'admin'
) ON CONFLICT (user_id) DO UPDATE SET username = 'admin';

INSERT INTO public.user_roles (user_id, role) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin'
) ON CONFLICT (user_id, role) DO NOTHING;

-- Cashier user: username=cajero, password=cajero123
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'cajero@sistema.local',
  crypt('cajero123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Cajero"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (user_id, full_name, email, username) 
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Cajero',
  'cajero@sistema.local',
  'cajero'
) ON CONFLICT (user_id) DO UPDATE SET username = 'cajero';

INSERT INTO public.user_roles (user_id, role) 
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'cashier'
) ON CONFLICT (user_id, role) DO NOTHING;