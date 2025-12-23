import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./useAuth";

export interface Customer {
  id: string;
  name: string;
  type: "cliente" | "proveedor";
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CustomerProduct {
  id: string;
  customer_id: string;
  product_id: string;
  price: number;
  notes?: string;
  created_at: string;
  product?: {
    name: string;
    sku: string;
  };
}

export interface CustomerTransaction {
  id: string;
  customer_id: string;
  type: "debt" | "payment";
  amount: number;
  description?: string;
  status: "pending" | "paid";
  paid_at?: string;
  created_at: string;
  created_by: string;
}

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers((data || []) as Customer[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const addCustomer = async (customer: Omit<Customer, "id" | "created_at" | "updated_at" | "created_by">) => {
    try {
      const { error } = await supabase
        .from("customers")
        .insert([{ ...customer, created_by: user?.id }]);

      if (error) throw error;

      toast({
        title: "Cliente creado",
        description: "El cliente se ha creado correctamente",
      });

      await fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    try {
      const { error } = await supabase
        .from("customers")
        .update(customer)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Cliente actualizado",
        description: "El cliente se ha actualizado correctamente",
      });

      await fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Cliente eliminado",
        description: "El cliente se ha eliminado correctamente",
      });

      await fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refresh: fetchCustomers,
  };
};

export const useCustomerProducts = (customerId?: string) => {
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("customer_products")
        .select(`
          *,
          product:products(name, sku)
        `)
        .eq("customer_id", customerId);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [customerId]);

  const addProduct = async (productId: string, price: number, notes?: string) => {
    if (!customerId) return;

    try {
      const { error } = await supabase
        .from("customer_products")
        .insert([{ customer_id: customerId, product_id: productId, price, notes }]);

      if (error) throw error;

      toast({
        title: "Producto vinculado",
        description: "El producto se ha vinculado correctamente",
      });

      await fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addMultipleProducts = async (productsToAdd: { id: string; price: number; notes?: string }[], isSupplier: boolean = false) => {
    if (!customerId || productsToAdd.length === 0) return;

    try {
      const insertData = productsToAdd.map((p) => ({
        customer_id: customerId,
        product_id: p.id,
        price: p.price,
        notes: p.notes,
      }));

      const { error } = await supabase
        .from("customer_products")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Productos vinculados",
        description: `Se han vinculado ${productsToAdd.length} producto(s) correctamente`,
      });

      await fetchProducts();

      // Si es un proveedor, sincronizar automáticamente las transacciones pendientes
      if (isSupplier) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            const response = await supabase.functions.invoke('sync-supplier-transactions', {
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            });

            if (response.data?.transactionsCreated?.length > 0) {
              toast({
                title: "Deudas sincronizadas",
                description: `Se crearon ${response.data.transactionsCreated.length} transacciones por ventas previas`,
              });
            }
          }
        } catch (syncError) {
          console.error("Error syncing supplier transactions:", syncError);
          // No mostrar error al usuario, la sincronización es opcional
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Producto desvinculado",
        description: "El producto se ha desvinculado correctamente",
      });

      await fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProductPrice = async (id: string, price: number) => {
    try {
      const { error } = await supabase
        .from("customer_products")
        .update({ price })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Precio actualizado",
        description: "El monto por venta se ha actualizado correctamente",
      });

      await fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    products,
    loading,
    addProduct,
    addMultipleProducts,
    removeProduct,
    updateProductPrice,
    refresh: fetchProducts,
  };
};

export const useCustomerTransactions = (customerId?: string) => {
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTransactions = async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("customer_transactions")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as CustomerTransaction[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [customerId]);

  const addTransaction = async (
    type: "debt" | "payment",
    amount: number,
    description?: string
  ) => {
    if (!customerId) return;

    try {
      const { error } = await supabase
        .from("customer_transactions")
        .insert([{
          customer_id: customerId,
          type,
          amount,
          description,
          created_by: user?.id,
        }]);

      if (error) throw error;

      toast({
        title: type === "debt" ? "Deuda registrada" : "Pago registrado",
        description: `Se ha registrado correctamente`,
      });

      await fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_transactions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: "La transacción se ha marcado como pagada",
      });

      await fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markMultipleAsPaid = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("customer_transactions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;

      toast({
        title: "Pagos registrados",
        description: `Se han marcado ${ids.length} transacciones como pagadas`,
      });

      await fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getBalance = () => {
    return transactions.reduce((acc, transaction) => {
      if (transaction.status === "paid") return acc;
      if (transaction.type === "debt") return acc + Number(transaction.amount);
      if (transaction.type === "payment") return acc - Number(transaction.amount);
      return acc;
    }, 0);
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Transacción eliminada",
        description: "La transacción se ha eliminado correctamente",
      });

      await fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteMultipleTransactions = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("customer_transactions")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast({
        title: "Transacciones eliminadas",
        description: `Se han eliminado ${ids.length} transacciones`,
      });

      await fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    transactions,
    loading,
    addTransaction,
    markAsPaid,
    markMultipleAsPaid,
    deleteTransaction,
    deleteMultipleTransactions,
    getBalance,
    refresh: fetchTransactions,
  };
};
