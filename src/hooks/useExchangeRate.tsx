import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";

interface ExchangeRateResponse {
  success: boolean;
  exchangeRate?: number;
  source?: string;
  date?: string;
  error?: string;
}

export const useExchangeRate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const [isFetching, setIsFetching] = useState(false);

  // Get the current exchange rate from settings
  const currentRate = settings?.usd_exchange_rate ?? 950;
  const lastUpdate = settings?.last_exchange_rate_update;
  const autoFetch = settings?.auto_fetch_exchange_rate ?? false;

  // Fetch live exchange rate from edge function
  const fetchLiveRate = useMutation({
    mutationFn: async (updateSettings: boolean = false): Promise<ExchangeRateResponse> => {
      setIsFetching(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-exchange-rate', {
          body: { updateSettings },
        });

        if (error) throw error;
        return data as ExchangeRateResponse;
      } finally {
        setIsFetching(false);
      }
    },
    onSuccess: (data) => {
      if (data.success && data.exchangeRate) {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        toast({
          title: "Tipo de cambio actualizado",
          description: `1 USD = $${data.exchangeRate.toLocaleString('es-CL')} CLP`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error al obtener tipo de cambio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Convert USD to CLP
  const convertUsdToClp = useCallback((usdAmount: number): number => {
    return Math.round(usdAmount * currentRate);
  }, [currentRate]);

  // Convert CLP to USD
  const convertClpToUsd = useCallback((clpAmount: number): number => {
    return clpAmount / currentRate;
  }, [currentRate]);

  // Format time since last update
  const getLastUpdateText = useCallback((): string => {
    if (!lastUpdate) return 'Nunca actualizado';
    
    const updateDate = new Date(lastUpdate);
    const now = new Date();
    const diffMs = now.getTime() - updateDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'Hace menos de 1 hora';
    }
  }, [lastUpdate]);

  return {
    currentRate,
    lastUpdate,
    autoFetch,
    isFetching,
    fetchLiveRate: fetchLiveRate.mutate,
    convertUsdToClp,
    convertClpToUsd,
    getLastUpdateText,
  };
};
