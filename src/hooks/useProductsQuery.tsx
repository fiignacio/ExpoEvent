import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { toast } from "sonner";

const PRODUCTS_KEY = ["products"];

const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    stock: item.stock,
    price: Number(item.price),
    cost: Number(item.cost),
    ...(item.promotion_type && {
      promotion: {
        type: item.promotion_type as "bulk" | "percentage" | "fixed",
        ...(item.promotion_quantity && { quantity: item.promotion_quantity }),
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
};

export function useProductsQuery() {
  const queryClient = useQueryClient();

  const {
    data: products = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: fetchProducts,
  });

  const addMutation = useMutation({
    mutationFn: async (product: Omit<Product, "id">) => {
      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            name: product.name,
            sku: product.sku,
            category: product.category,
            stock: product.stock,
            price: product.price,
            cost: product.cost,
            promotion_type: product.promotion?.type,
            promotion_quantity: product.promotion?.quantity,
            promotion_discounted_price: product.promotion?.discountedPrice,
            promotion_discount_percentage: product.promotion?.discountPercentage,
            promotion_discount_amount: product.promotion?.discountAmount,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Producto agregado");
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al agregar producto");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      product,
    }: {
      id: string;
      product: Omit<Product, "id">;
    }) => {
      const { error } = await supabase
        .from("products")
        .update({
          name: product.name,
          sku: product.sku,
          category: product.category,
          stock: product.stock,
          price: product.price,
          cost: product.cost,
          promotion_type: product.promotion?.type || null,
          promotion_quantity: product.promotion?.quantity || null,
          promotion_discounted_price: product.promotion?.discountedPrice || null,
          promotion_discount_percentage:
            product.promotion?.discountPercentage || null,
          promotion_discount_amount: product.promotion?.discountAmount || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Producto actualizado");
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar producto");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar producto");
    },
  });

  const bulkUpsertMutation = useMutation({
    mutationFn: async (productsToImport: Omit<Product, "id">[]) => {
      const errors: string[] = [];
      const productsToUpsert = [];

      for (const p of productsToImport) {
        const validPromotionTypes = ["bulk", "percentage", "fixed"];
        const promotionType =
          p.promotion?.type && validPromotionTypes.includes(p.promotion.type)
            ? p.promotion.type
            : null;

        const productData = {
          sku: p.sku,
          name: p.name,
          category: p.category,
          stock: Number(p.stock),
          price: Number(p.price),
          cost: Number(p.cost),
          promotion_type: promotionType,
          promotion_quantity:
            promotionType && p.promotion?.quantity
              ? Number(p.promotion.quantity)
              : null,
          promotion_discounted_price:
            promotionType && p.promotion?.discountedPrice
              ? Number(p.promotion.discountedPrice)
              : null,
          promotion_discount_percentage:
            promotionType && p.promotion?.discountPercentage
              ? Number(p.promotion.discountPercentage)
              : null,
          promotion_discount_amount:
            promotionType && p.promotion?.discountAmount
              ? Number(p.promotion.discountAmount)
              : null,
        };

        if (isNaN(productData.stock) || !Number.isInteger(productData.stock)) {
          errors.push(`Producto ${p.sku}: Stock inválido`);
          continue;
        }
        if (isNaN(productData.price)) {
          errors.push(`Producto ${p.sku}: Precio inválido`);
          continue;
        }
        if (isNaN(productData.cost)) {
          errors.push(`Producto ${p.sku}: Costo inválido`);
          continue;
        }

        productsToUpsert.push(productData);
      }

      if (errors.length > 0) {
        toast.error(
          `Errores en ${errors.length} producto(s):\n${errors.slice(0, 3).join("\n")}`,
          { duration: 10000 }
        );
      }

      if (productsToUpsert.length === 0) {
        throw new Error("No hay productos válidos para importar");
      }

      const { error } = await supabase
        .from("products")
        .upsert(productsToUpsert, { onConflict: "sku" });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al importar productos", {
        duration: 10000,
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (
      updates: { id: string; data: Partial<Omit<Product, "id">> }[]
    ) => {
      const updatePromises = updates.map(({ id, data }) =>
        supabase
          .from("products")
          .update({
            ...(data.name && { name: data.name }),
            ...(data.category && { category: data.category }),
            ...(data.stock !== undefined && { stock: Number(data.stock) }),
            ...(data.price !== undefined && { price: Number(data.price) }),
            ...(data.cost !== undefined && { cost: Number(data.cost) }),
            ...(data.promotion !== undefined && {
              promotion_type: data.promotion?.type || null,
              promotion_quantity: data.promotion?.quantity
                ? Number(data.promotion.quantity)
                : null,
              promotion_discounted_price: data.promotion?.discountedPrice
                ? Number(data.promotion.discountedPrice)
                : null,
              promotion_discount_percentage: data.promotion?.discountPercentage
                ? Number(data.promotion.discountPercentage)
                : null,
              promotion_discount_amount: data.promotion?.discountAmount
                ? Number(data.promotion.discountAmount)
                : null,
            }),
          })
          .eq("id", id)
      );

      const results = await Promise.all(updatePromises);
      const errorsFound = results.filter((r) => r.error);

      if (errorsFound.length > 0) {
        throw new Error(
          `${errorsFound.length} productos no se pudieron actualizar`
        );
      }

      return true;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.length} productos actualizados`);
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar productos");
    },
  });

  return {
    products,
    loading,
    addProduct: addMutation.mutateAsync,
    updateProduct: (id: string, product: Omit<Product, "id">) =>
      updateMutation.mutateAsync({ id, product }),
    deleteProduct: deleteMutation.mutateAsync,
    bulkUpsert: bulkUpsertMutation.mutateAsync,
    bulkUpdate: bulkUpdateMutation.mutateAsync,
    refresh: refetch,
  };
}
