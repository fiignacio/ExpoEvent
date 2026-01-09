-- Add new columns to settings table for cash payment configuration
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS quick_cash_amounts text DEFAULT '[3000, 5000, 10000, 20000]',
ADD COLUMN IF NOT EXISTS usd_exchange_rate numeric DEFAULT 950,
ADD COLUMN IF NOT EXISTS auto_fetch_exchange_rate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_exchange_rate_update timestamp with time zone DEFAULT NULL;