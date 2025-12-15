import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const CUSTOMERS_KEY = ["customers"];

const fetchCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Customer[];
};

export const useCustomersQuery = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    data: customers = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: fetchCustomers,
  });

  const addMutation = useMutation({
    mutationFn: async (
      customer: Omit<Customer, "id" | "created_at" | "updated_at" | "created_by">
    ) => {
      const { error } = await supabase
        .from("customers")
        .insert([{ ...customer, created_by: user?.id }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cliente creado",
        description: "El cliente se ha creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      customer,
    }: {
      id: string;
      customer: Partial<Customer>;
    }) => {
      const { error } = await supabase
        .from("customers")
        .update(customer)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cliente actualizado",
        description: "El cliente se ha actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cliente eliminado",
        description: "El cliente se ha eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    customers,
    loading,
    addCustomer: addMutation.mutateAsync,
    updateCustomer: (id: string, customer: Partial<Customer>) =>
      updateMutation.mutateAsync({ id, customer }),
    deleteCustomer: deleteMutation.mutateAsync,
    refresh: refetch,
  };
};
