-- ====================================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS PARA EXPOVENTAS POS (SUPABASE)
-- Ejecutar en: https://supabase.com/dashboard/project/yaxigkduogyehamssmad/sql/new
-- ====================================================================

-- 1. TABLA DE PRODUCTOS (ID TEXT para compatibilidad total con evt-001 y UUIDs)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  stock NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  promotion_type TEXT,
  promotion_quantity INTEGER,
  promotion_discounted_price NUMERIC,
  promotion_discount_percentage NUMERIC,
  promotion_discount_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver productos" ON public.products;
DROP POLICY IF EXISTS "Todos pueden crear productos" ON public.products;
DROP POLICY IF EXISTS "Todos pueden actualizar productos" ON public.products;
DROP POLICY IF EXISTS "Todos pueden eliminar productos" ON public.products;

CREATE POLICY "Todos pueden ver productos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Todos pueden crear productos" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar productos" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar productos" ON public.products FOR DELETE USING (true);

-- 2. TABLA DE VENTAS OFFLINE / EVENTO
CREATE TABLE IF NOT EXISTS public.offline_sales (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  change_amount NUMERIC DEFAULT 0,
  cash_amount NUMERIC DEFAULT 0,
  paid_in_usd BOOLEAN DEFAULT false,
  usd_amount NUMERIC DEFAULT 0,
  exchange_rate_used NUMERIC DEFAULT 0,
  synced BOOLEAN DEFAULT true,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.offline_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver ventas" ON public.offline_sales;
DROP POLICY IF EXISTS "Todos pueden crear ventas" ON public.offline_sales;
DROP POLICY IF EXISTS "Todos pueden actualizar ventas" ON public.offline_sales;

CREATE POLICY "Todos pueden ver ventas" ON public.offline_sales FOR SELECT USING (true);
CREATE POLICY "Todos pueden crear ventas" ON public.offline_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar ventas" ON public.offline_sales FOR UPDATE USING (true);

-- 3. TABLA DE CONFIGURACIONES (SETTINGS)
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT NOT NULL DEFAULT 'default' PRIMARY KEY,
  store_name TEXT DEFAULT 'ExpoVentas POS',
  tax_rate NUMERIC DEFAULT 0,
  allow_negative_stock BOOLEAN DEFAULT false,
  quick_cash_amounts TEXT DEFAULT '[3000, 5000, 10000, 20000]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver settings" ON public.settings;
DROP POLICY IF EXISTS "Todos pueden modificar settings" ON public.settings;

CREATE POLICY "Todos pueden ver settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Todos pueden modificar settings" ON public.settings FOR ALL USING (true);

INSERT INTO public.settings (id, store_name, tax_rate) VALUES ('default', 'ExpoVentas POS', 0) ON CONFLICT DO NOTHING;

-- 4. TABLA DE SESIONES DE CAJA (CASH REGISTER SESSIONS)
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id TEXT,
  initial_amount NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver sesiones" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Todos pueden modificar sesiones" ON public.cash_register_sessions;

CREATE POLICY "Todos pueden ver sesiones" ON public.cash_register_sessions FOR SELECT USING (true);
CREATE POLICY "Todos pueden modificar sesiones" ON public.cash_register_sessions FOR ALL USING (true);

-- 5. TABLA DE CLIENTES Y PROVEEDORES (CUSTOMERS)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type TEXT DEFAULT 'cliente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden clientes" ON public.customers;
CREATE POLICY "Todos pueden clientes" ON public.customers FOR ALL USING (true);

-- 6. TABLAS AUXILIARES (PERMISOS, ROLES, PERFILES, CÓDIGOS DE ACCESO)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT NOT NULL PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden profiles" ON public.profiles;
CREATE POLICY "Todos pueden profiles" ON public.profiles FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cajero'
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden user_roles" ON public.user_roles;
CREATE POLICY "Todos pueden user_roles" ON public.user_roles FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  role TEXT NOT NULL,
  menu_item TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden role_permissions" ON public.role_permissions;
CREATE POLICY "Todos pueden role_permissions" ON public.role_permissions FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.access_codes (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'cajero',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden access_codes" ON public.access_codes;
CREATE POLICY "Todos pueden access_codes" ON public.access_codes FOR ALL USING (true);

INSERT INTO public.access_codes (code, role) VALUES ('1234', 'cajero'), ('ADMIN', 'admin') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customer_products (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden customer_products" ON public.customer_products;
CREATE POLICY "Todos pueden customer_products" ON public.customer_products FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.customer_transactions (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden customer_transactions" ON public.customer_transactions;
CREATE POLICY "Todos pueden customer_transactions" ON public.customer_transactions FOR ALL USING (true);

-- 7. REPLICACIÓN EN TIEMPO REAL (REALTIME)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.products, public.offline_sales, public.settings, public.cash_register_sessions;
COMMIT;

-- 8. PRODUCTOS INICIALES DEL EVENTO
INSERT INTO public.products (id, sku, name, category, stock, price, cost, promotion_type, promotion_quantity, promotion_discounted_price)
VALUES 
  ('evt-001', 'TSH-001', 'Polera Oficial Evento 2026', 'Merchandising', 150, 15000, 7000, 'bulk', 2, 25000),
  ('evt-002', 'CAP-001', 'Jockey / Gorro Bordado', 'Merchandising', 80, 10000, 4000, 'bulk', 3, 25000),
  ('evt-003', 'MUG-001', 'Taza Conmemorativa', 'Accesorios', 120, 7000, 2500, 'percentage', NULL, NULL),
  ('evt-004', 'BEB-001', 'Bebida / Agua Mineral 500ml', 'Bebidas y Snacks', 300, 2000, 800, 'bulk', 3, 5000),
  ('evt-005', 'SNK-001', 'Combo Snack & Ensalada', 'Bebidas y Snacks', 90, 4500, 2000, 'fixed', NULL, NULL),
  ('evt-006', 'VIP-001', 'Pase VIP Acceso Exclusivo', 'Entradas', 50, 35000, 5000, NULL, NULL, NULL)
ON CONFLICT (sku) DO UPDATE SET 
  stock = EXCLUDED.stock,
  price = EXCLUDED.price;
