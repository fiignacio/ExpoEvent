-- ====================================================================
-- ESQUEMA COMPLETO Y FUNCIONES RPC PARA EXPOVENTAS POS (SUPABASE)
-- Ejecutar en: https://supabase.com/dashboard/project/yaxigkduogyehamssmad/sql/new
-- ====================================================================

-- LIMPIEZA PREVIA DE TABLAS SI YA EXISTÍAN CON TIPO UUID
DROP TABLE IF EXISTS public.customer_transactions CASCADE;
DROP TABLE IF EXISTS public.customer_products CASCADE;
DROP TABLE IF EXISTS public.offline_sales CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.cash_register_sessions CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.access_codes CASCADE;

-- 1. TABLA DE PRODUCTOS
CREATE TABLE public.products (
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
CREATE POLICY "Todos pueden ver productos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Todos pueden crear productos" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar productos" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar productos" ON public.products FOR DELETE USING (true);

-- 2. TABLA DE VENTAS
CREATE TABLE public.offline_sales (
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
CREATE POLICY "Todos pueden ver ventas" ON public.offline_sales FOR SELECT USING (true);
CREATE POLICY "Todos pueden crear ventas" ON public.offline_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden modificar ventas" ON public.offline_sales FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE CONFIGURACIONES (SETTINGS)
CREATE TABLE public.settings (
  id TEXT NOT NULL DEFAULT 'default' PRIMARY KEY,
  business_name TEXT DEFAULT 'ExpoVentas POS',
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  tax_rate NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'CLP',
  currency_symbol TEXT DEFAULT '$',
  receipt_footer TEXT,
  low_stock_threshold NUMERIC DEFAULT 10,
  allow_negative_stock BOOLEAN DEFAULT false,
  auto_print_receipt BOOLEAN DEFAULT false,
  require_customer_info BOOLEAN DEFAULT false,
  enable_promotions BOOLEAN DEFAULT true,
  quick_cash_amounts TEXT DEFAULT '[3000, 5000, 10000, 20000]',
  usd_exchange_rate NUMERIC DEFAULT 950,
  auto_fetch_exchange_rate BOOLEAN DEFAULT false,
  last_exchange_rate_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Todos pueden modificar settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.settings (id, business_name, tax_rate) VALUES ('default', 'ExpoVentas POS', 0) ON CONFLICT DO NOTHING;

-- 4. TABLA DE SESIONES DE CAJA
CREATE TABLE public.cash_register_sessions (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id TEXT,
  initial_amount NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver sesiones" ON public.cash_register_sessions FOR SELECT USING (true);
CREATE POLICY "Todos pueden modificar sesiones" ON public.cash_register_sessions FOR ALL USING (true) WITH CHECK (true);

-- 5. TABLA DE CLIENTES Y PROVEEDORES
CREATE TABLE public.customers (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type TEXT DEFAULT 'cliente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden clientes" ON public.customers FOR ALL USING (true);

-- 6. PERMISOS, ROLES Y AUTENTICACIÓN POR CÓDIGO (RPC)
CREATE TABLE public.profiles (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT,
  full_name TEXT,
  email TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden profiles" ON public.profiles FOR ALL USING (true);

CREATE TABLE public.user_roles (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cajero'
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden user_roles" ON public.user_roles FOR ALL USING (true);

CREATE TABLE public.role_permissions (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  role TEXT NOT NULL,
  menu_item TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden role_permissions" ON public.role_permissions FOR ALL USING (true);

CREATE TABLE public.access_codes (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'cajero',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden access_codes" ON public.access_codes FOR ALL USING (true);

INSERT INTO public.access_codes (code, role) VALUES ('1234', 'cajero'), ('ADMIN', 'admin') ON CONFLICT DO NOTHING;

CREATE TABLE public.customer_products (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden customer_products" ON public.customer_products FOR ALL USING (true);

CREATE TABLE public.customer_transactions (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden customer_transactions" ON public.customer_transactions FOR ALL USING (true);

-- 7. FUNCIONES RPC PARA INICIO DE SESIÓN RÁPIDO CON CÓDIGO (1234 Y ADMIN)
CREATE OR REPLACE FUNCTION public.authenticate_with_code(_code TEXT)
RETURNS TABLE (
  user_id TEXT,
  role TEXT,
  user_name TEXT,
  email TEXT
) AS $$
BEGIN
  IF UPPER(_code) = 'ADMIN' THEN
    RETURN QUERY SELECT 'admin-001'::TEXT, 'admin'::TEXT, 'Administrador Evento'::TEXT, 'admin@expoventas.cl'::TEXT;
  ELSIF _code = '1234' THEN
    RETURN QUERY SELECT 'cajero-001'::TEXT, 'cajero'::TEXT, 'Cajero Evento'::TEXT, 'cajero@expoventas.cl'::TEXT;
  ELSE
    RETURN QUERY SELECT ac.id::TEXT, ac.role::TEXT, CASE WHEN ac.role = 'admin' THEN 'Administrador Evento' ELSE 'Cajero Evento' END, ac.role || '@expoventas.cl' FROM public.access_codes ac WHERE ac.code = _code;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_role_on_login(_email TEXT, _role TEXT)
RETURNS VOID AS $$
BEGIN
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. REPLICACIÓN EN TIEMPO REAL (REALTIME)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.products, public.offline_sales, public.settings, public.cash_register_sessions, public.customers, public.customer_products, public.customer_transactions;
COMMIT;

-- 9. PRODUCTOS INICIALES DEL EVENTO (UUIDs Estándar Compatibles)
INSERT INTO public.products (id, sku, name, category, stock, price, cost, promotion_type, promotion_quantity, promotion_discounted_price)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'TSH-001', 'Polera Oficial Evento 2026', 'Merchandising', 150, 15000, 7000, 'bulk', 2, 25000),
  ('a2222222-2222-2222-2222-222222222222', 'CAP-001', 'Jockey / Gorro Bordado', 'Merchandising', 80, 10000, 4000, 'bulk', 3, 25000),
  ('a3333333-3333-3333-3333-333333333333', 'MUG-001', 'Taza Conmemorativa', 'Accesorios', 120, 7000, 2500, 'percentage', NULL, NULL),
  ('a4444444-4444-4444-4444-444444444444', 'BEB-001', 'Bebida / Agua Mineral 500ml', 'Bebidas y Snacks', 300, 2000, 800, 'bulk', 3, 5000),
  ('a5555555-5555-5555-5555-555555555555', 'SNK-001', 'Combo Snack & Ensalada', 'Bebidas y Snacks', 90, 4500, 2000, 'fixed', NULL, NULL),
  ('a6666666-6666-6666-6666-666666666666', 'VIP-001', 'Pase VIP Acceso Exclusivo', 'Entradas', 50, 35000, 5000, NULL, NULL, NULL)
ON CONFLICT (sku) DO UPDATE SET 
  stock = EXCLUDED.stock,
  price = EXCLUDED.price;
