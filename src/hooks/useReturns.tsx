import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStockMovements } from "@/hooks/useStockMovements";
import { toast } from "sonner";

export type ReturnType = "full" | "partial";
export type RefundMethod = "cash" | "credit_note" | "original_method";

export interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  returnQuantity: number;
}

export interface ReturnRecord {
  id: string;
  sale_id: string;
  type: ReturnType;
  reason: string;
  refund_method: RefundMethod;
  items: ReturnItem[];
  total_refunded: number;
  created_by: string;
  created_at: string;
  sale?: {
    total: number;
    payment_method: string;
    created_at: string;
  };
}

export interface SaleForReturn {
  id: string;
  items: any[];
  total: number;
  subtotal: number;
  tax: number;
  payment_method: string;
  created_at: string;
  status: string;
}

export function useReturns() {
  const { user } = useAuth();
  const { recordMovement } = useStockMovements();
  const [loading, setLoading] = useState(false);

  const searchSale = useCallback(async (saleId: string): Promise<SaleForReturn | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('offline_sales')
        .select('*')
        .eq('id', saleId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Venta no encontrada");
        return null;
      }

      if (data.status === 'returned') {
        toast.error("Esta venta ya fue devuelta completamente");
        return null;
      }

      return {
        ...data,
        items: data.items as any[]
      };
    } catch (error: any) {
      toast.error("Error al buscar venta: " + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const processReturn = useCallback(async (
    sale: SaleForReturn,
    returnItems: ReturnItem[],
    reason: string,
    refundMethod: RefundMethod
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error("No estás autenticado");
      return false;
    }

    try {
      setLoading(true);

      // Calculate totals
      const totalRefunded = returnItems.reduce(
        (sum, item) => sum + (item.price * item.returnQuantity), 0
      );

      const isFullReturn = returnItems.every(
        item => item.returnQuantity === item.quantity
      );

      // Determine sale status after return
      const newStatus = isFullReturn ? 'returned' : 'partial_return';

      // 1. Create return record
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .insert([{
          sale_id: sale.id,
          type: isFullReturn ? 'full' : 'partial',
          reason,
          refund_method: refundMethod,
          items: returnItems as any,
          total_refunded: totalRefunded,
          created_by: user.id
        }])
        .select()
        .single();

      if (returnError) throw returnError;

      // 2. Update sale status
      const { error: saleError } = await supabase
        .from('offline_sales')
        .update({ status: newStatus })
        .eq('id', sale.id);

      if (saleError) throw saleError;

      // 3. Restore stock for returned items
      for (const item of returnItems) {
        if (item.returnQuantity > 0) {
          // Get current stock
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.id)
            .single();

          if (product) {
            const currentStock = product.stock;
            const newStock = currentStock + item.returnQuantity;

            // Update stock
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.id);

            // Record movement
            await recordMovement(
              item.id,
              'return',
              item.returnQuantity,
              currentStock,
              newStock,
              returnData.id,
              'return',
              `Devolución: ${item.returnQuantity}x ${item.name}`
            );
          }
        }
      }

      const methodLabels: Record<RefundMethod, string> = {
        cash: "efectivo",
        credit_note: "nota de crédito",
        original_method: "método original"
      };

      toast.success(
        `Devolución procesada: $${totalRefunded.toLocaleString('es-CL')} - ${methodLabels[refundMethod]}`
      );
      return true;
    } catch (error: any) {
      toast.error("Error al procesar devolución: " + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, recordMovement]);

  const fetchReturns = useCallback(async (limit: number = 50): Promise<ReturnRecord[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          sale:offline_sales(total, payment_method, created_at)
        `)
        .order('created_at', { ascending: false })
        .limit(limit) as any;

      if (error) throw error;
      return (data || []) as ReturnRecord[];
    } catch (error: any) {
      console.error("Error fetching returns:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchSale,
    processReturn,
    fetchReturns,
    loading
  };
}
