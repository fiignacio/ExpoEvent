-- Crear tabla de productos con soporte para promociones
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  promotion_type TEXT CHECK (promotion_type IN ('bulk', 'percentage', 'fixed')),
  promotion_quantity INTEGER,
  promotion_discounted_price DECIMAL(10,2),
  promotion_discount_percentage DECIMAL(5,2),
  promotion_discount_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Política para permitir a todos leer productos (pública)
CREATE POLICY "Todos pueden ver productos"
  ON public.products
  FOR SELECT
  USING (true);

-- Política para permitir a todos insertar productos
CREATE POLICY "Todos pueden crear productos"
  ON public.products
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir a todos actualizar productos
CREATE POLICY "Todos pueden actualizar productos"
  ON public.products
  FOR UPDATE
  USING (true);

-- Política para permitir a todos eliminar productos
CREATE POLICY "Todos pueden eliminar productos"
  ON public.products
  FOR DELETE
  USING (true);

-- Crear función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Crear trigger para actualizar timestamps automáticamente
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_products_updated_at();

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_stock ON public.products(stock);