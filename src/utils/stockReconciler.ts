import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { toast } from "sonner";

const OFFLINE_SALES_KEY = "offline_sales";
const LOCAL_PRODUCTS_KEY = "expoventas_products";

export interface ProductReconciliationItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  totalSold: number;
  initialStock: number;
  suggestedStock: number;
  difference: number;
  isDesynced: boolean;
}

/**
 * Obtiene todas las ventas combinadas (localStorage + Supabase) sin duplicados
 */
export async function fetchAllSalesCombined(): Promise<any[]> {
  const salesMap = new Map<string, any>();

  // 1. Cargar ventas locales
  try {
    const stored = localStorage.getItem(OFFLINE_SALES_KEY);
    if (stored) {
      const local: any[] = JSON.parse(stored);
      local.forEach((s) => {
        if (s.id) salesMap.set(s.id, s);
      });
    }
  } catch (e) {
    console.error("Error reading local sales:", e);
  }

  // 2. Cargar ventas remotas de Supabase
  try {
    const { data: remoteSales, error } = await supabase.from("offline_sales").select("*");
    if (!error && Array.isArray(remoteSales)) {
      remoteSales.forEach((s) => {
        if (!salesMap.has(s.id)) {
          salesMap.set(s.id, {
            id: s.id,
            items: s.items || [],
            total: Number(s.total || 0),
            created_at: s.created_at,
          });
        } else {
          // Si ya existe pero el remoto tiene items válidos, asegurar que los items estén presentes
          const existing = salesMap.get(s.id);
          if ((!existing.items || existing.items.length === 0) && s.items) {
            existing.items = s.items;
            salesMap.set(s.id, existing);
          }
        }
      });
    }
  } catch (e) {
    console.warn("No se pudieron cargar ventas de Supabase:", e);
  }

  return Array.from(salesMap.values());
}

/**
 * Agrupa todas las unidades vendidas por SKU, ID y Nombre
 */
export function aggregateUnitsSoldByProduct(sales: any[]): {
  bySku: Map<string, number>;
  byId: Map<string, number>;
  byName: Map<string, number>;
} {
  const bySku = new Map<string, number>();
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();

  sales.forEach((sale) => {
    const items = Array.isArray(sale.items) ? sale.items : [];
    items.forEach((item: any) => {
      const qty = Number(item.quantity || 1);

      if (item.sku) {
        const key = item.sku.trim().toUpperCase();
        bySku.set(key, (bySku.get(key) || 0) + qty);
      }

      if (item.id) {
        byId.set(item.id, (byId.get(item.id) || 0) + qty);
      }

      if (item.name) {
        const key = item.name.trim().toLowerCase();
        byName.set(key, (byName.get(key) || 0) + qty);
      }
    });
  });

  return { bySku, byId, byName };
}

/**
 * Calcula el análisis de reconciliación para cada producto del inventario
 */
export async function computeInventoryReconciliation(
  currentProducts: Product[],
  initialStockOverrides: Record<string, number> = {}
): Promise<ProductReconciliationItem[]> {
  const allSales = await fetchAllSalesCombined();
  const { bySku, byId, byName } = aggregateUnitsSoldByProduct(allSales);

  return currentProducts.map((p) => {
    const currentStock = Number(p.stock || 0);

    // Calcular cuántas unidades se han vendido en total según el registro de ventas
    const skuKey = p.sku ? p.sku.trim().toUpperCase() : "";
    const nameKey = p.name ? p.name.trim().toLowerCase() : "";

    const soldBySku = skuKey ? (bySku.get(skuKey) || 0) : 0;
    const soldById = p.id ? (byId.get(p.id) || 0) : 0;
    const soldByName = nameKey ? (byName.get(nameKey) || 0) : 0;

    // Tomamos el valor más alto o coincidente de ventas
    const totalSold = Math.max(soldBySku, soldById, soldByName);

    // Determinar el Stock Base Inicial:
    // 1. Si el usuario definió un override explícito
    // 2. Si el producto ya tiene initialStock guardado
    // 3. Si el nombre o SKU es PIN y no tiene override, verificar 300
    // 4. De lo contrario, inferir base = currentStock + totalSold
    let initialStock = currentStock + totalSold;

    if (initialStockOverrides[p.id] !== undefined) {
      initialStock = initialStockOverrides[p.id];
    } else if (p.initialStock !== undefined && p.initialStock > 0) {
      initialStock = p.initialStock;
    } else if (p.name.toLowerCase().includes("pin") && initialStock < 300 && (currentStock + totalSold <= 300)) {
      initialStock = 300;
    }

    const suggestedStock = Math.max(0, initialStock - totalSold);
    const difference = currentStock - suggestedStock;
    const isDesynced = difference !== 0;

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      currentStock,
      totalSold,
      initialStock,
      suggestedStock,
      difference,
      isDesynced,
    };
  });
}

/**
 * Aplica la reconciliación y guarda el stock corregido tanto en localStorage como en Supabase
 */
export async function applyStockReconciliation(
  reconciledItems: ProductReconciliationItem[]
): Promise<boolean> {
  try {
    // 1. Actualizar localStorage
    let localProducts: Product[] = [];
    try {
      const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      if (stored) localProducts = JSON.parse(stored);
    } catch {}

    const itemMap = new Map(reconciledItems.map((r) => [r.id, r]));

    const updatedLocal = localProducts.map((p) => {
      const match = itemMap.get(p.id) || (p.sku ? reconciledItems.find((r) => r.sku.toLowerCase() === p.sku.toLowerCase()) : null);
      if (match) {
        return {
          ...p,
          stock: match.suggestedStock,
          initialStock: match.initialStock,
        };
      }
      return p;
    });

    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updatedLocal));

    // 2. Actualizar en Supabase (por ID y por SKU)
    const updatePromises = reconciledItems.map(async (item) => {
      const payload: any = {
        stock: item.suggestedStock,
        updated_at: new Date().toISOString(),
      };

      try {
        if (item.id) {
          const { error } = await supabase.from("products").update(payload).eq("id", item.id);
          if (!error) return;
        }
      } catch {}

      try {
        if (item.sku) {
          await supabase.from("products").update(payload).eq("sku", item.sku);
        }
      } catch {}
    });

    await Promise.all(updatePromises);

    toast.success(`¡Stock de ${reconciledItems.length} productos sincronizado exitosamente con las ventas!`);
    return true;
  } catch (error: any) {
    console.error("Error applying stock reconciliation:", error);
    toast.error(`Error al sincronizar stock: ${error?.message || "Error desconocido"}`);
    return false;
  }
}
