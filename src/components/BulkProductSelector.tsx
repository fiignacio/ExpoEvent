import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
}

interface SelectedProduct {
  id: string;
  name: string;
  price: number;
}

interface BulkProductSelectorProps {
  products: Product[];
  existingProductIds: string[];
  onAddProducts: (products: SelectedProduct[]) => Promise<void>;
  onClose: () => void;
}

export function BulkProductSelector({
  products,
  existingProductIds,
  onAddProducts,
  onClose,
}: BulkProductSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => cats.add(p.category));
    return Array.from(cats).sort();
  }, [products]);

  // Filter products by category and search term, excluding already linked products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Exclude already linked products
      if (existingProductIds.includes(p.id)) return false;
      
      // Filter by category
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchTerm, existingProductIds]);

  const handleToggleProduct = (product: Product, checked: boolean) => {
    const newSelected = new Map(selectedProducts);
    if (checked) {
      newSelected.set(product.id, product.price);
    } else {
      newSelected.delete(product.id);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAllVisible = (checked: boolean) => {
    const newSelected = new Map(selectedProducts);
    if (checked) {
      filteredProducts.forEach((p) => {
        newSelected.set(p.id, p.price);
      });
    } else {
      filteredProducts.forEach((p) => {
        newSelected.delete(p.id);
      });
    }
    setSelectedProducts(newSelected);
  };

  const handlePriceChange = (productId: string, price: number) => {
    const newSelected = new Map(selectedProducts);
    newSelected.set(productId, price);
    setSelectedProducts(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedProducts.size === 0) return;
    
    setIsSubmitting(true);
    const productsToAdd: SelectedProduct[] = [];
    
    selectedProducts.forEach((price, id) => {
      const product = products.find((p) => p.id === id);
      if (product) {
        productsToAdd.push({
          id: product.id,
          name: product.name,
          price,
        });
      }
    });
    
    await onAddProducts(productsToAdd);
    setIsSubmitting(false);
    onClose();
  };

  const allVisibleSelected = filteredProducts.length > 0 && 
    filteredProducts.every((p) => selectedProducts.has(p.id));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {selectedProducts.size} producto(s) seleccionado(s)
          </span>
        </div>
        {filteredProducts.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allVisibleSelected}
              onCheckedChange={handleSelectAllVisible}
            />
            <Label htmlFor="select-all" className="text-sm cursor-pointer">
              Seleccionar todos ({filteredProducts.length})
            </Label>
          </div>
        )}
      </div>

      {/* Product list */}
      <ScrollArea className="h-[300px] border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = selectedProducts.has(product.id);
              const currentPrice = selectedProducts.get(product.id) ?? product.price;
              
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isSelected ? "bg-primary/5 border-primary/30" : "bg-background hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleToggleProduct(product, !!checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{product.sku}</span>
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={currentPrice}
                      onChange={(e) => handlePriceChange(product.id, Number(e.target.value))}
                      className="w-24 h-8"
                      disabled={!isSelected}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={selectedProducts.size === 0 || isSubmitting}
        >
          {isSubmitting ? "Agregando..." : `Vincular ${selectedProducts.size} producto(s)`}
        </Button>
      </div>
    </div>
  );
}
