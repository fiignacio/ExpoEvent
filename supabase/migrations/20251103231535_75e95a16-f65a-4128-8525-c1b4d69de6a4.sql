-- Create settings table to store system configuration
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT 'Mi Negocio',
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  receipt_footer TEXT,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings access
CREATE POLICY "Todos pueden ver configuraciones"
ON public.settings
FOR SELECT
USING (true);

CREATE POLICY "Todos pueden actualizar configuraciones"
ON public.settings
FOR UPDATE
USING (true);

CREATE POLICY "Todos pueden crear configuraciones"
ON public.settings
FOR INSERT
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_products_updated_at();

-- Insert default settings
INSERT INTO public.settings (business_name, tax_rate, currency, currency_symbol, low_stock_threshold)
VALUES ('Mi Negocio', 16, 'MXN', '$', 10);