
-- Permitir a administradores eliminar ventas
CREATE POLICY "Admins can delete sales"
ON public.offline_sales
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
