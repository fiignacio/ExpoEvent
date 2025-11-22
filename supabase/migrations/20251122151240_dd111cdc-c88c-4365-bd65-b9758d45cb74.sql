-- Add new functional settings columns
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS allow_negative_stock boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_print_receipt boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_customer_info boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_promotions boolean DEFAULT true;

COMMENT ON COLUMN public.settings.allow_negative_stock IS 'Permite realizar ventas incluso cuando el stock es 0 o negativo';
COMMENT ON COLUMN public.settings.auto_print_receipt IS 'Imprime automáticamente el recibo después de cada venta';
COMMENT ON COLUMN public.settings.require_customer_info IS 'Requiere información del cliente para completar una venta';
COMMENT ON COLUMN public.settings.enable_promotions IS 'Habilita el sistema de promociones en el POS';