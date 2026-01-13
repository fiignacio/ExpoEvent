import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type MovementType = "sale" | "return" | "adjustment" | "restock" | "initial";

export interface StockMovement {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  product?: {
    name: string;
    sku: string;
  };
  user?: {
    full_name: string;
  };
}

export function useStockMovements() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const recordMovement = useCallback(async (
    productId: string,
    type: MovementType,
    quantity: number,
    previousStock: number,
    newStock: number,
    referenceId?: string,
    referenceType?: string,
    notes?: string
  ) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          type,
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_id: referenceId || null,
          reference_type: referenceType || null,
          notes: notes || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Error recording stock movement:", error);
      return null;
    }
  }, [user?.id]);

  const recordSaleMovements = useCallback(async (
    saleId: string,
    items: Array<{ id: string; quantity: number; stock: number; name: string }>
  ) => {
    if (!user?.id) return;

    try {
      const movements = items.map(item => ({
        product_id: item.id,
        type: 'sale' as MovementType,
        quantity: -item.quantity,
        previous_stock: item.stock,
        new_stock: item.stock - item.quantity,
        reference_id: saleId,
        reference_type: 'sale',
        notes: `Venta: ${item.quantity}x ${item.name}`,
        created_by: user.id
      }));

      const { error } = await supabase
        .from('stock_movements')
        .insert(movements);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error recording sale movements:", error);
    }
  }, [user?.id]);

  const recordAdjustment = useCallback(async (
    productId: string,
    previousStock: number,
    newStock: number,
    reason: string
  ) => {
    if (!user?.id) {
      toast.error("No estás autenticado");
      return false;
    }

    try {
      setLoading(true);
      const quantity = newStock - previousStock;

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Record movement
      const { error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          type: 'adjustment',
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          notes: reason,
          created_by: user.id
        });

      if (error) throw error;

      toast.success("Ajuste de stock registrado");
      return true;
    } catch (error: any) {
      toast.error("Error al ajustar stock: " + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchMovements = useCallback(async (
    productId?: string,
    limit: number = 50
  ): Promise<StockMovement[]> => {
    try {
      setLoading(true);
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(name, sku)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user names separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.created_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        return data.map(m => ({
          ...m,
          user: { full_name: profileMap.get(m.created_by) || 'Usuario' }
        })) as StockMovement[];
      }

      return [];
    } catch (error: any) {
      console.error("Error fetching movements:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    recordMovement,
    recordSaleMovements,
    recordAdjustment,
    fetchMovements,
    loading
  };
}
