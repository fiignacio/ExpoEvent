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
        const parsed: OfflineSale[] = JSON.parse(stored);
        const actualPending = parsed.filter((s: any) => s.paymentMethod === "pendiente" || s.synced === false);
        setPendingSales(actualPending);
      } else {
        setPendingSales([]);
      }
    } catch (error) {
      console.error("Error loading pending sales:", error);
    }
  };

  const savePendingSales = (allSales: any[]) => {
    try {
      localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(allSales));
      const actualPending = allSales.filter((s: any) => s.paymentMethod === "pendiente" || s.synced === false);
      setPendingSales(actualPending);
    } catch (error) {
      console.error("Error saving pending sales:", error);
    }
  };

  const addOfflineSale = (sale: Omit<OfflineSale, "id" | "timestamp">) => {
    const isPendingMethod = sale.paymentMethod === "pendiente";
    const newSale: any = {
      ...sale,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      synced: !isPendingMethod
    };

    let allStored: any[] = [];
    try {
      const stored = localStorage.getItem(OFFLINE_SALES_KEY);
      if (stored) allStored = JSON.parse(stored);
    } catch {}

    const updated = [newSale, ...allStored.filter((s: any) => s.id !== newSale.id)];
    savePendingSales(updated);
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