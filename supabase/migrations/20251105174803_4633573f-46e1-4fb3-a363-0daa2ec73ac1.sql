-- Crear tabla para sesiones de caja
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  initial_amount NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user_id ON public.cash_register_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_register_sessions(status);

-- Habilitar RLS
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own sessions"
ON public.cash_register_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.cash_register_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.cash_register_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins pueden ver todas las sesiones
CREATE POLICY "Admins can view all sessions"
ON public.cash_register_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Crear tabla para ventas offline
CREATE TABLE IF NOT EXISTS public.offline_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.cash_register_sessions(id),
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Índices para ventas offline
CREATE INDEX IF NOT EXISTS idx_offline_sales_user_id ON public.offline_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sales_synced ON public.offline_sales(synced);
CREATE INDEX IF NOT EXISTS idx_offline_sales_session_id ON public.offline_sales(session_id);

-- Habilitar RLS
ALTER TABLE public.offline_sales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para offline_sales
CREATE POLICY "Users can view their own sales"
ON public.offline_sales
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales"
ON public.offline_sales
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
ON public.offline_sales
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins pueden ver todas las ventas
CREATE POLICY "Admins can view all sales"
ON public.offline_sales
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));