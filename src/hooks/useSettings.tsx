import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Settings {
  id: string;
  business_name: string;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  tax_rate: number;
  currency: string;
  currency_symbol: string;
  receipt_footer: string | null;
  low_stock_threshold: number;
  allow_negative_stock: boolean;
  auto_print_receipt: boolean;
  require_customer_info: boolean;
  enable_promotions: boolean;
}

export const useSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Settings | null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      if (!settings?.id) throw new Error("No settings found");

      const { data, error } = await supabase
        .from("settings")
        .update(updates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
  };
};
