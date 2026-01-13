-- =============================================
-- SISTEMA DE MEJORAS POS: TABLAS NUEVAS
-- =============================================

-- 1. Tabla de movimientos de stock (historial)
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'return', 'adjustment', 'restock', 'initial')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabla de devoluciones
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.offline_sales(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('full', 'partial')),
  reason TEXT NOT NULL,
  refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'credit_note', 'original_method')),
  items JSONB NOT NULL,
  total_refunded NUMERIC NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabla de retiros parciales de caja
CREATE TABLE public.cash_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.cash_register_sessions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Agregar status a offline_sales para tracking de devoluciones
ALTER TABLE public.offline_sales 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed' 
CHECK (status IN ('completed', 'returned', 'partial_return'));

-- 5. Agregar campos para arqueo detallado en cash_register_sessions
ALTER TABLE public.cash_register_sessions
ADD COLUMN IF NOT EXISTS denomination_breakdown JSONB,
ADD COLUMN IF NOT EXISTS expected_amount NUMERIC,
ADD COLUMN IF NOT EXISTS difference NUMERIC,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Stock Movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view stock movements"
ON public.stock_movements FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert stock movements"
ON public.stock_movements FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only admins can update stock movements"
ON public.stock_movements FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete stock movements"
ON public.stock_movements FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Returns
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view returns"
ON public.returns FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert returns"
ON public.returns FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only admins can update returns"
ON public.returns FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete returns"
ON public.returns FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Cash Withdrawals
ALTER TABLE public.cash_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session withdrawals"
ON public.cash_withdrawals FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cash_register_sessions 
    WHERE id = cash_withdrawals.session_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all withdrawals"
ON public.cash_withdrawals FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert withdrawals"
ON public.cash_withdrawals FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only admins can update withdrawals"
ON public.cash_withdrawals FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete withdrawals"
ON public.cash_withdrawals FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON public.returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_session_id ON public.cash_withdrawals(session_id);

-- Enable realtime for stock movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;