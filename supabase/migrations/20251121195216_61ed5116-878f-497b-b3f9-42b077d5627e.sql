-- Fix foreign key constraint to allow cascading deletes
-- When a cash register session is deleted, associated sales should also be deleted

ALTER TABLE public.offline_sales 
DROP CONSTRAINT IF EXISTS offline_sales_session_id_fkey;

ALTER TABLE public.offline_sales
ADD CONSTRAINT offline_sales_session_id_fkey 
FOREIGN KEY (session_id) 
REFERENCES public.cash_register_sessions(id) 
ON DELETE CASCADE;