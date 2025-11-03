import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Product } from "@/types/product";
import { toast } from "sonner";

interface ProductDialogProps {
  onSave: (product: Omit<Product, "id">) => void;
  trigger?: React.ReactNode;
}

export function ProductDialog({ onSave, trigger }: ProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    stock: "",
    price: "",
    cost: "",
    promoType: "none",
    promoQuantity: "",
    promoPrice: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast.error("Nombre y precio son obligatorios");
      return;
    }

    const product: Omit<Product, "id"> = {
      name: formData.name,
      sku: formData.sku || `SKU-${Date.now()}`,
      category: formData.category || "Sin categoría",
      stock: Number(formData.stock) || 0,
      price: Number(formData.price),
      cost: Number(formData.cost) || 0,
    };

    if (formData.promoType !== "none" && formData.promoQuantity && formData.promoPrice) {
      product.promotion = {
        type: "bulk",
        quantity: Number(formData.promoQuantity),
        discountedPrice: Number(formData.promoPrice),
      };
    }

    onSave(product);
    toast.success("Producto guardado");
    setOpen(false);
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Producto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
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
              <Label htmlFor="stock">Stock Inicial</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="100"
              />
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
                  <SelectItem value="bulk">Por Cantidad (ej: 3 x $10,000)</SelectItem>
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
                  <Label htmlFor="promoPrice">Precio Promoción</Label>
                  <Input
                    id="promoPrice"
                    type="number"
                    step="0.01"
                    value={formData.promoPrice}
                    onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })}
                    placeholder="10000"
                  />
                </div>
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
