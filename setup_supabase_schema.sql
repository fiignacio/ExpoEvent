-- =========================================================
-- ESQUEMA DE BASE DE DATOS PARA EXPOVENTAS POS (SUPABASE)
-- Ejecutar este script en: https://supabase.com/dashboard/project/yaxigkduogyehamssmad/sql/new
-- =========================================================

-- 1. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  stock NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  promotion_type TEXT CHECK (promotion_type IN ('bulk', 'percentage', 'fixed')),
  promotion_quantity INTEGER,
  promotion_discounted_price NUMERIC,
  promotion_discount_percentage NUMERIC,
  promotion_discount_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS y Políticas de Productos
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
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
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

-- RLS y Políticas de Ventas
ALTER TABLE public.offline_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver ventas" ON public.offline_sales;
DROP POLICY IF EXISTS "Todos pueden crear ventas" ON public.offline_sales;

CREATE POLICY "Todos pueden ver ventas" ON public.offline_sales FOR SELECT USING (true);
CREATE POLICY "Todos pueden crear ventas" ON public.offline_sales FOR INSERT WITH CHECK (true);

-- 3. HABILITAR REPLICACIÓN EN TIEMPO REAL (REALTIME)
-- Esto permite que los cambios (crear, editar, eliminar) en el computador se reflejen en vivo en el teléfono
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.products, public.offline_sales;
COMMIT;

-- 4. INSERTAR PRODUCTOS POR DEFECTO DEL EVENTO
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
