-- Add columns for mixed payment breakdown and USD tracking
ALTER TABLE offline_sales ADD COLUMN IF NOT EXISTS cash_amount numeric DEFAULT 0;
ALTER TABLE offline_sales ADD COLUMN IF NOT EXISTS paid_in_usd boolean DEFAULT false;
ALTER TABLE offline_sales ADD COLUMN IF NOT EXISTS usd_amount numeric DEFAULT 0;
ALTER TABLE offline_sales ADD COLUMN IF NOT EXISTS exchange_rate_used numeric DEFAULT 0;