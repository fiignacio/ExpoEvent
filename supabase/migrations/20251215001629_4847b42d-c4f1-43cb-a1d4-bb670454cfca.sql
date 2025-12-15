-- Drop the existing check constraint first
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_type_check;