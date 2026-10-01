import { useState, useEffect, useCallback } from "react";
import { Product } from "@/types/product";
import { DEFAULT_EVENT_PRODUCTS } from "@/utils/defaultProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LOCAL_PRODUCTS_KEY = "expoventas_products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocalProducts = (): Product[] => {
    try {
      const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(DEFAULT_EVENT_PRODUCTS));
      return DEFAULT_EVENT_PRODUCTS;
    } catch {
      return DEFAULT_EVENT_PRODUCTS;
    }
  };

  const saveLocalProducts = (updated: Product[]) => {
    try {
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving local products:", e);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      // 1. Intentar cargar desde Supabase (nube)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (!error && data && data.length > 0) {
        const mappedProducts: Product[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          stock: Number(item.stock),
          price: Number(item.price),
          cost: Number(item.cost),
          ...(item.promotion_type && {
            promotion: {
              type: item.promotion_type as "bulk" | "percentage" | "fixed",
              ...(item.promotion_quantity && { quantity: Number(item.promotion_quantity) }),
              ...(item.promotion_discounted_price && {
                discountedPrice: Number(item.promotion_discounted_price),
              }),
              ...(item.promotion_discount_percentage && {
                discountPercentage: Number(item.promotion_discount_percentage),
              }),
              ...(item.promotion_discount_amount && {
                discountAmount: Number(item.promotion_discount_amount),
              }),
            },
          }),
        }));

        setProducts(mappedProducts);
        saveLocalProducts(mappedProducts);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("No se pudo sincronizar con la nube, usando almacenamiento local:", e);
    }

    // Fallback a almacenamiento local
    const local = loadLocalProducts();
    setProducts(local);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();

    // Suscribirse a cambios en tiempo real en Supabase para sincronizar PC ↔ Móvil
    const channel = supabase
      .channel("products_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  const addProduct = async (product: Omit<Product, "id">) => {
    const newId = crypto.randomUUID();
    const newProd: Product = { ...product, id: newId };

    // Actualizar estado local
    setProducts(prev => {
      const updated = [...prev, newProd].sort((a, b) => a.name.localeCompare(b.name));
      saveLocalProducts(updated);
      return updated;
    });

    // Intentar guardar en Supabase
    try {
      await supabase.from("products").insert([
        {
          id: newId,
          sku: product.sku,
          name: product.name,
          category: product.category,
          stock: product.stock,
          price: product.price,
          cost: product.cost,
          promotion_type: product.promotion?.type || null,
          promotion_quantity: product.promotion?.quantity || null,
          promotion_discounted_price: product.promotion?.discountedPrice || null,
          promotion_discount_percentage: product.promotion?.discountPercentage || null,
          promotion_discount_amount: product.promotion?.discountAmount || null,
        }
      ]);
    } catch (e) {
      console.error("Error al guardar en Supabase:", e);
    }

    toast.success("Producto agregado al catálogo del evento");
    return newProd;
  };

  const updateProduct = async (id: string, product: Omit<Product, "id">) => {
    const updatedProd: Product = { ...product, id };

    setProducts(prev => {
      const updated = prev.map(p => p.id === id ? updatedProd : p);
      saveLocalProducts(updated);
      return updated;
    });

    try {
      await supabase
        .from("products")
        .update({
          sku: product.sku,
          name: product.name,
          category: product.category,
          stock: product.stock,
          price: product.price,
          cost: product.cost,
          promotion_type: product.promotion?.type || null,
          promotion_quantity: product.promotion?.quantity || null,
          promotion_discounted_price: product.promotion?.discountedPrice || null,
          promotion_discount_percentage: product.promotion?.discountPercentage || null,
          promotion_discount_amount: product.promotion?.discountAmount || null,
        })
        .eq("id", id);
    } catch (e) {
      console.error("Error al actualizar en Supabase:", e);
    }

    toast.success("Producto actualizado");
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveLocalProducts(updated);
      return updated;
    });

    try {
      await supabase.from("products").delete().eq("id", id);
    } catch (e) {
      console.error("Error al eliminar en Supabase:", e);
    }

    toast.success("Producto eliminado del inventario del evento");
  };

  const bulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;

    setProducts(prev => {
      const idSet = new Set(ids);
      const updated = prev.filter(p => !idSet.has(p.id));
      saveLocalProducts(updated);
      return updated;
    });

    try {
      await supabase.from("products").delete().in("id", ids);
    } catch (e) {
      console.error("Error en bulkDelete Supabase:", e);
    }

    toast.success(`${ids.length} productos eliminados del evento`);
  };

  const bulkUpsert = async (importedProducts: Omit<Product, "id">[]) => {
    try {
      setProducts(prev => {
        const productMap = new Map<string, Product>();
        prev.forEach(p => productMap.set(p.sku.toLowerCase(), p));

        importedProducts.forEach(p => {
          const existing = productMap.get(p.sku.toLowerCase());
          if (existing) {
            productMap.set(p.sku.toLowerCase(), { ...p, id: existing.id });
          } else {
            const newId = crypto.randomUUID();
            productMap.set(p.sku.toLowerCase(), { ...p, id: newId });
          }
        });

        const updated = Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        saveLocalProducts(updated);
        return updated;
      });

      // Guardar también en Supabase
      const toUpsert = importedProducts.map(p => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        stock: p.stock,
        price: p.price,
        cost: p.cost,
        promotion_type: p.promotion?.type || null,
        promotion_quantity: p.promotion?.quantity || null,
        promotion_discounted_price: p.promotion?.discountedPrice || null,
        promotion_discount_percentage: p.promotion?.discountPercentage || null,
        promotion_discount_amount: p.promotion?.discountAmount || null,
      }));

      await supabase.from("products").upsert(toUpsert, { onConflict: "sku" });

      toast.success(`${importedProducts.length} productos procesados con éxito`);
      return true;
    } catch (error: any) {
      toast.error("Error al importar productos: " + error.message);
      throw error;
    }
  };

  const bulkUpdate = async (updates: { id: string; data: Partial<Omit<Product, "id">> }[]) => {
    setProducts(prev => {
      const updateMap = new Map(updates.map(u => [u.id, u.data]));
      const updated = prev.map(p => {
        const change = updateMap.get(p.id);
        if (!change) return p;
        return { ...p, ...change };
      });
      saveLocalProducts(updated);
      return updated;
    });

    try {
      const updatePromises = updates.map(({ id, data }) =>
        supabase
          .from("products")
          .update({
            ...(data.name && { name: data.name }),
            ...(data.category && { category: data.category }),
            ...(data.stock !== undefined && { stock: Number(data.stock) }),
            ...(data.price !== undefined && { price: Number(data.price) }),
            ...(data.cost !== undefined && { cost: Number(data.cost) }),
          })
          .eq("id", id)
      );
      await Promise.all(updatePromises);
    } catch (e) {
      console.error("Error en bulkUpdate Supabase:", e);
    }

    toast.success(`${updates.length} productos actualizados`);
    return true;
  };

  const resetToDefaultProducts = async () => {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(DEFAULT_EVENT_PRODUCTS));
    setProducts(DEFAULT_EVENT_PRODUCTS);
    toast.success("Catálogo restablecido a los productos por defecto del evento");
  };

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkDelete,
    bulkUpsert,
    bulkUpdate,
    resetToDefaultProducts,
    refresh: fetchProducts,
  };
}


