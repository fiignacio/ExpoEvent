import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import { CartItem } from "@/types/product";

interface OfflineSale {
  id: string;
  sessionId: string | null;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  changeAmount?: number;
  timestamp: number;
}

const OFFLINE_SALES_KEY = "offline_sales";

export function useOfflineSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);

  useEffect(() => {
    loadPendingSales();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexión restaurada");
      syncPendingSales();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Modo offline activado");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const loadPendingSales = () => {
    try {
      const stored = localStorage.getItem(OFFLINE_SALES_KEY);
      if (stored) {
        setPendingSales(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading pending sales:", error);
    }
  };

  const savePendingSales = (sales: OfflineSale[]) => {
    try {
      localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(sales));
      setPendingSales(sales);
    } catch (error) {
      console.error("Error saving pending sales:", error);
    }
  };

  const addOfflineSale = (sale: Omit<OfflineSale, "id" | "timestamp">) => {
    const newSale: OfflineSale = {
      ...sale,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    const updated = [...pendingSales, newSale];
    savePendingSales(updated);
    toast.info("Venta guardada para sincronización");
    return newSale;
  };

  const syncPendingSales = async () => {
    // In isolated local event mode, sales are saved directly in local event storage.
    setIsSyncing(false);
  };

  return {
    isOnline,
    isSyncing,
    pendingSales,
    addOfflineSale,
    syncPendingSales
  };
}