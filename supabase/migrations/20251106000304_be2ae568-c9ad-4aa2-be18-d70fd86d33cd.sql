-- Agregar campo para almacenar el vuelto en ventas de efectivo
ALTER TABLE public.offline_sales
ADD COLUMN change_amount numeric DEFAULT 0;