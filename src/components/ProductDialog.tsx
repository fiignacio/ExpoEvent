import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Product } from "@/types/product";
import { toast } from "sonner";

interface ProductDialogProps {
  onSave: (product: Omit<Product, "id">) => void;
  trigger?: React.ReactNode;
  product?: Product;
  onUpdate?: (id: string, product: Omit<Product, "id">) => void;
  onClose?: () => void;
}

export function ProductDialog({ onSave, trigger, product: editingProduct, onUpdate, onClose }: ProductDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!editingProduct;
  
  const [formData, setFormData] = useState({
    name: editingProduct?.name || "",
    sku: editingProduct?.sku || "",
    category: editingProduct?.category || "",
    stock: editingProduct?.stock.toString() || "",
    price: editingProduct?.price.toString() || "",
    cost: editingProduct?.cost.toString() || "",
    promoType: editingProduct?.promotion?.type || "none",
    promoQuantity: editingProduct?.promotion?.quantity?.toString() || "",
    promoPrice: editingProduct?.promotion?.discountedPrice?.toString() || "",
    promoPercentage: editingProduct?.promotion?.discountPercentage?.toString() || "",
    promoAmount: editingProduct?.promotion?.discountAmount?.toString() || "",
  });

  const [stockMode, setStockMode] = useState<"set" | "add">("set");
  const [stockToAdd, setStockToAdd] = useState("");

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        sku: editingProduct.sku,
        category: editingProduct.category,
        stock: editingProduct.stock.toString(),
        price: editingProduct.price.toString(),
        cost: editingProduct.cost.toString(),
        promoType: editingProduct.promotion?.type || "none",
        promoQuantity: editingProduct.promotion?.quantity?.toString() || "",
        promoPrice: editingProduct.promotion?.discountedPrice?.toString() || "",
        promoPercentage: editingProduct.promotion?.discountPercentage?.toString() || "",
        promoAmount: editingProduct.promotion?.discountAmount?.toString() || "",
      });
      setOpen(true);
      setStockMode("set");
      setStockToAdd("");
    }
  }, [editingProduct]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast.error("Nombre y precio son obligatorios");
      return;
    }

    const finalStock = stockMode === "add" && isEditing
      ? (editingProduct?.stock || 0) + Number(stockToAdd || 0)
      : Number(formData.stock) || 0;

    const product: Omit<Product, "id"> = {
      name: formData.name,
      sku: formData.sku || `SKU-${Date.now()}`,
      category: formData.category || "Sin categoría",
      stock: finalStock,
      price: Number(formData.price),
      cost: Number(formData.cost) || 0,
    };

    if (formData.promoType !== "none") {
      if (formData.promoType === "bulk" && formData.promoQuantity && formData.promoPrice) {
        product.promotion = {
          type: "bulk",
          quantity: Number(formData.promoQuantity),
          discountedPrice: Number(formData.promoPrice),
        };
      } else if (formData.promoType === "percentage" && formData.promoPercentage) {
        product.promotion = {
          type: "percentage",
          discountPercentage: Number(formData.promoPercentage),
        };
      } else if (formData.promoType === "fixed" && formData.promoAmount) {
        product.promotion = {
          type: "fixed",
          discountAmount: Number(formData.promoAmount),
        };
      }
    }

    if (isEditing && onUpdate && editingProduct) {
      onUpdate(editingProduct.id, product);
      toast.success("Producto actualizado");
    } else {
      onSave(product);
      toast.success("Producto creado");
    }
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category: "",
      stock: "",
      price: "",
      cost: "",
      promoType: "none",
      promoQuantity: "",
      promoPrice: "",
      promoPercentage: "",
      promoAmount: "",
    });
    setStockMode("set");
    setStockToAdd("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetForm();
        onClose?.();
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Producto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="product-dialog-description">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          <DialogDescription id="product-dialog-description">Completa los campos del producto y guarda los cambios.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Café Americano"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="BEB-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Bebidas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">{isEditing ? "Stock" : "Stock Inicial"}</Label>
              {isEditing && (
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={stockMode === "set" ? "default" : "outline"}
                    onClick={() => setStockMode("set")}
                    className="flex-1"
                  >
                    Establecer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={stockMode === "add" ? "default" : "outline"}
                    onClick={() => setStockMode("add")}
                    className="flex-1"
                  >
                    Agregar
                  </Button>
                </div>
              )}
              {stockMode === "add" && isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Stock actual: <strong>{editingProduct?.stock}</strong></span>
                  </div>
                  <Input
                    id="stockToAdd"
                    type="number"
                    min="0"
                    value={stockToAdd}
                    onChange={(e) => setStockToAdd(e.target.value)}
                    placeholder="Cantidad a agregar"
                  />
                  {stockToAdd && Number(stockToAdd) > 0 && (
                    <div className="text-sm text-success font-medium">
                      Stock final: {(editingProduct?.stock || 0) + Number(stockToAdd)}
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="100"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Costo</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="2.50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="5.00"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Promoción (Opcional)</h3>
            <div className="space-y-2">
              <Label htmlFor="promoType">Tipo de Promoción</Label>
              <Select value={formData.promoType} onValueChange={(value) => setFormData({ ...formData, promoType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin promoción</SelectItem>
                  <SelectItem value="bulk">Por Cantidad (ej: 3 x $10)</SelectItem>
                  <SelectItem value="percentage">Descuento % (ej: 10% OFF)</SelectItem>
                  <SelectItem value="fixed">Descuento Fijo (ej: $5 OFF)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.promoType === "bulk" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="promoQuantity">Cantidad</Label>
                  <Input
                    id="promoQuantity"
                    type="number"
                    value={formData.promoQuantity}
                    onChange={(e) => setFormData({ ...formData, promoQuantity: e.target.value })}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoPrice">Precio Total Promoción</Label>
                  <Input
                    id="promoPrice"
                    type="number"
                    step="0.01"
                    value={formData.promoPrice}
                    onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })}
                    placeholder="10.00"
                  />
                </div>
              </div>
            )}

            {formData.promoType === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="promoPercentage">Porcentaje de Descuento (%)</Label>
                <Input
                  id="promoPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.promoPercentage}
                  onChange={(e) => setFormData({ ...formData, promoPercentage: e.target.value })}
                  placeholder="10"
                />
              </div>
            )}

            {formData.promoType === "fixed" && (
              <div className="space-y-2">
                <Label htmlFor="promoAmount">Monto de Descuento ($)</Label>
                <Input
                  id="promoAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.promoAmount}
                  onChange={(e) => setFormData({ ...formData, promoAmount: e.target.value })}
                  placeholder="5.00"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Producto</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}