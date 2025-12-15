-- Allow authenticated users to insert customer_transactions for supplier commissions
-- This is needed because POS sales automatically create supplier debt transactions

-- Drop existing insert policy
DROP POLICY IF EXISTS "Only admins can insert transactions" ON public.customer_transactions;

-- Create new policy that allows all authenticated users to insert transactions
CREATE POLICY "Authenticated users can insert transactions" 
ON public.customer_transactions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Note: The update and delete policies remain admin-only for security