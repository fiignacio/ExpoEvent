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

    // Suscribirse a ventas en tiempo real para sincronizar PC ↔ Móvil
    const channel = supabase
      .channel("offline_sales_realtime_sync")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "offline_sales" },
        (payload) => {
          if (payload.new) {
            const remoteSale = payload.new;
            try {
              const stored = localStorage.getItem(OFFLINE_SALES_KEY);
              const current: any[] = stored ? JSON.parse(stored) : [];
              if (!current.some(s => s.id === remoteSale.id)) {
                const formatted = {
                  id: remoteSale.id,
                  sessionId: remoteSale.session_id,
                  items: remoteSale.items || [],
                  subtotal: Number(remoteSale.subtotal || 0),
                  tax: Number(remoteSale.tax || 0),
                  total: Number(remoteSale.total || 0),
                  paymentMethod: remoteSale.payment_method || "efectivo",
                  changeAmount: Number(remoteSale.change_amount || 0),
                  timestamp: new Date(remoteSale.created_at || Date.now()).getTime(),
                  synced: true
                };
                savePendingSales([formatted, ...current]);
              }
            } catch (e) {
              console.error("Error processing realtime sale:", e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
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

  const addOfflineSale = async (sale: Omit<OfflineSale, "id" | "timestamp">) => {
    const isPendingMethod = sale.paymentMethod === "pendiente";
    const saleId = crypto.randomUUID();
    const newSale: any = {
      ...sale,
      id: saleId,
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

    // Intentar guardar en Supabase inmediatamente para sincronizar con otros dispositivos
    try {
      await supabase.from("offline_sales").insert([{
        id: saleId,
        user_id: user?.id || "event-user-001",
        session_id: (sale as any).sessionId || null,
        items: (sale as any).items || [],
        subtotal: (sale as any).subtotal || 0,
        tax: (sale as any).tax || 0,
        total: (sale as any).total || 0,
        payment_method: sale.paymentMethod || "efectivo",
        change_amount: (sale as any).changeAmount || 0,
        cash_amount: (sale as any).cash_amount || 0,
        paid_in_usd: (sale as any).paid_in_usd || false,
        usd_amount: (sale as any).usd_amount || 0,
        exchange_rate_used: (sale as any).exchange_rate_used || 0,
        synced: true,
        created_at: new Date(newSale.timestamp).toISOString()
      }]);
    } catch (e) {
      console.warn("No se pudo subir la venta a Supabase, guardada localmente:", e);
    }

    return newSale;
  };

  const syncPendingSales = async () => {
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