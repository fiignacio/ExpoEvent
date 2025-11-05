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
    if (!user || pendingSales.length === 0 || isSyncing) return;

    setIsSyncing(true);
    let successCount = 0;
    const failedSales: OfflineSale[] = [];

    for (const sale of pendingSales) {
      try {
        // Guardar en la base de datos
        const { error: dbError } = await supabase
          .from('offline_sales')
          .insert([{
            user_id: user.id,
            session_id: sale.sessionId,
            items: sale.items as any,
            subtotal: sale.subtotal,
            tax: sale.tax,
            total: sale.total,
            payment_method: sale.paymentMethod,
            synced: true,
            synced_at: new Date().toISOString()
          }]);

        if (dbError) throw dbError;

        // Actualizar stock de productos
        for (const item of sale.items) {
          const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.id)
            .single();

          if (fetchError) throw fetchError;

          const newStock = (product.stock || 0) - item.quantity;
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.id);

          if (updateError) throw updateError;
        }

        successCount++;
      } catch (error: any) {
        console.error("Error syncing sale:", error);
        failedSales.push(sale);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} venta(s) sincronizada(s)`);
    }

    if (failedSales.length > 0) {
      toast.error(`${failedSales.length} venta(s) fallaron al sincronizar`);
      savePendingSales(failedSales);
    } else {
      savePendingSales([]);
    }

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