import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { toast } from "sonner";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      const mappedProducts: Product[] = (data || []).map(item => ({
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
            ...(item.promotion_discounted_price && { discountedPrice: Number(item.promotion_discounted_price) }),
            ...(item.promotion_discount_percentage && { discountPercentage: Number(item.promotion_discount_percentage) }),
            ...(item.promotion_discount_amount && { discountAmount: Number(item.promotion_discount_amount) }),
          }
        })
      }));

      setProducts(mappedProducts);
    } catch (error: any) {
      toast.error("Error al cargar productos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Omit<Product, "id">) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
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
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Producto agregado");
      await fetchProducts();
      return data;
    } catch (error: any) {
      toast.error(error.message || "Error al agregar producto");
      throw error;
    }
  };

  const updateProduct = async (id: string, product: Omit<Product, "id">) => {
    try {
      const { error } = await supabase
        .from('products')
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
          promotion_discount_percentage: product.promotion?.discountPercentage || null,
          promotion_discount_amount: product.promotion?.discountAmount || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success("Producto actualizado");
      await fetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar producto");
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Producto eliminado");
      await fetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar producto");
      throw error;
    }
  };

  const bulkUpsert = async (products: Omit<Product, "id">[]) => {
    try {
      const errors: string[] = [];
      const productsToUpsert = [];

      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        try {
          const productData = {
            sku: p.sku,
            name: p.name,
            category: p.category,
            stock: Number(p.stock),
            price: Number(p.price),
            cost: Number(p.cost),
            promotion_type: p.promotion?.type || null,
            promotion_quantity: p.promotion?.quantity ? Number(p.promotion.quantity) : null,
            promotion_discounted_price: p.promotion?.discountedPrice ? Number(p.promotion.discountedPrice) : null,
            promotion_discount_percentage: p.promotion?.discountPercentage ? Number(p.promotion.discountPercentage) : null,
            promotion_discount_amount: p.promotion?.discountAmount ? Number(p.promotion.discountAmount) : null,
          };

          // Validar que los números sean válidos
          if (isNaN(productData.stock)) {
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
        } catch (err: any) {
          errors.push(`Producto ${p.sku}: ${err.message}`);
        }
      }

      if (errors.length > 0) {
        const errorMsg = `Errores en ${errors.length} producto(s):\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`;
        toast.error(errorMsg, { duration: 10000 });
        console.error("Errores detallados:", errors);
      }

      if (productsToUpsert.length === 0) {
        throw new Error("No hay productos válidos para importar");
      }

      const { error, data } = await supabase
        .from('products')
        .upsert(productsToUpsert, { onConflict: 'sku' });

      if (error) {
        const detailedError = `Error de base de datos: ${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (Sugerencia: ${error.hint})` : ''}`;
        toast.error(detailedError, { duration: 10000 });
        throw new Error(detailedError);
      }

      await fetchProducts();
      return true;
    } catch (error: any) {
      console.error("Error detallado:", error);
      const errorMessage = error.message || "Error al importar productos";
      if (!errorMessage.includes("Error de base de datos")) {
        toast.error(errorMessage, { duration: 10000 });
      }
      throw error;
    }
  };

  const bulkUpdate = async (updates: { id: string; data: Partial<Omit<Product, "id">> }[]) => {
    try {
      const updatePromises = updates.map(({ id, data }) => 
        supabase
          .from('products')
          .update({
            ...(data.name && { name: data.name }),
            ...(data.category && { category: data.category }),
            ...(data.stock !== undefined && { stock: Number(data.stock) }),
            ...(data.price !== undefined && { price: Number(data.price) }),
            ...(data.cost !== undefined && { cost: Number(data.cost) }),
            ...(data.promotion !== undefined && {
              promotion_type: data.promotion?.type || null,
              promotion_quantity: data.promotion?.quantity ? Number(data.promotion.quantity) : null,
              promotion_discounted_price: data.promotion?.discountedPrice ? Number(data.promotion.discountedPrice) : null,
              promotion_discount_percentage: data.promotion?.discountPercentage ? Number(data.promotion.discountPercentage) : null,
              promotion_discount_amount: data.promotion?.discountAmount ? Number(data.promotion.discountAmount) : null,
            }),
          })
          .eq('id', id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`${errors.length} productos no se pudieron actualizar`);
      }

      toast.success(`${updates.length} productos actualizados`);
      await fetchProducts();
      return true;
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar productos");
      throw error;
    }
  };

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkUpsert,
    bulkUpdate,
    refresh: fetchProducts,
  };
}
