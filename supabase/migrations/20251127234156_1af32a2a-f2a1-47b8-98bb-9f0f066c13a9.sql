-- Create function to prevent duplicate sales
CREATE OR REPLACE FUNCTION public.prevent_duplicate_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a sale with the same total and user_id exists within the last 5 seconds
  IF EXISTS (
    SELECT 1 
    FROM public.offline_sales 
    WHERE user_id = NEW.user_id 
      AND total = NEW.total 
      AND created_at > (now() - interval '5 seconds')
  ) THEN
    RAISE EXCEPTION 'Venta duplicada detectada. Por favor espere unos segundos antes de procesar otra venta con el mismo monto.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run before insert
CREATE TRIGGER prevent_duplicate_sales_trigger
BEFORE INSERT ON public.offline_sales
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_sales();