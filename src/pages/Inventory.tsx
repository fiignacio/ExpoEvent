import { useState } from "react";
import { Search, Edit, Trash2, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/product";
import { ExcelImport } from "@/components/ExcelImport";
import { ProductDialog } from "@/components/ProductDialog";
import { getPromotionLabel } from "@/utils/promotions";
import { useProducts } from "@/hooks/useProducts";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const { products, loading, addProduct, updateProduct, deleteProduct, bulkUpsert } = useProducts();

  const filteredInventory = products.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = async (product: Omit<Product, "id">) => {
    await addProduct(product);
  };

  const handleUpdateProduct = async (id: string, product: Omit<Product, "id">) => {
    await updateProduct(id, product);
    setEditingProduct(undefined);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
  };

  const handleBulkImport = async (importedProducts: Omit<Product, "id">[]) => {
    await bulkUpsert(importedProducts);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando inventario...</div>
      </div>
    );
  }

  const getStockBadge = (stock: number) => {
    if (stock < 10) {
      return <Badge variant="destructive">Stock Bajo</Badge>;
    } else if (stock < 50) {
      return <Badge className="bg-warning text-warning-foreground">Stock Medio</Badge>;
    } else {
      return <Badge className="bg-success text-success-foreground">Stock Alto</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground mt-1">Gestiona tu catálogo de productos</p>
        </div>
        <div className="flex gap-2">
          <ExcelImport onImport={handleBulkImport} />
          <ProductDialog 
            onSave={handleAddProduct}
            product={editingProduct}
            onUpdate={handleUpdateProduct}
            onClose={() => setEditingProduct(undefined)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
          <p className="text-sm text-muted-foreground">Total Productos</p>
                <p className="text-2xl font-bold mt-1">{products.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold mt-1 text-success">
                ${products.reduce((sum, item) => sum + (item.stock * item.cost), 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">Stock Bajo</p>
              <p className="text-2xl font-bold mt-1 text-destructive">
                {products.filter(item => item.stock < 10).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">Categorías</p>
              <p className="text-2xl font-bold mt-1">
                {new Set(products.map(item => item.category)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Productos</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Promoción</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const margin = ((item.price - item.cost) / item.price * 100).toFixed(1);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.stock}</span>
                        {getStockBadge(item.stock)}
                      </div>
                    </TableCell>
                    <TableCell>${item.cost.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">${item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.promotion ? (
                        <Badge variant="outline" className="gap-1">
                          <Tag className="w-3 h-3" />
                          {getPromotionLabel(item)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-success">{margin}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setEditingProduct(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
