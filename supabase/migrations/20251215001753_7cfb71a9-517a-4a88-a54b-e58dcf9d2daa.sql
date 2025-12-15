-- Add new check constraint with Spanish types only
ALTER TABLE customers ADD CONSTRAINT customers_type_check 
  CHECK (type IN ('cliente', 'proveedor'));