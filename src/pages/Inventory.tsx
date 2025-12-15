import { useState } from "react";
import { Search, Edit, Trash2, Package, Tag, Save, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
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
import { EditableCell } from "@/components/EditableCell";
import { getPromotionLabel } from "@/utils/promotions";
import { useProducts } from "@/hooks/useProducts";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [editMode, setEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Omit<Product, "id">>>>(new Map());
  const { products, loading, addProduct, updateProduct, deleteProduct, bulkUpsert, bulkUpdate, refresh } = useProducts();

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

  const handleCellUpdate = (productId: string, field: keyof Product, value: any) => {
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      const existing = newChanges.get(productId) || {};
      newChanges.set(productId, { ...existing, [field]: value });
      return newChanges;
    });
  };

  const handleSavePendingChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.error("No hay cambios pendientes");
      return;
    }

    const updates = Array.from(pendingChanges.entries()).map(([id, data]) => ({
      id,
      data
    }));

    await bulkUpdate(updates);
    setPendingChanges(new Map());
    setEditMode(false);
  };

  const handleCancelChanges = () => {
    setPendingChanges(new Map());
    setEditMode(false);
  };

  const getDisplayValue = (product: Product, field: keyof Product) => {
    const pendingChange = pendingChanges.get(product.id);
    if (pendingChange && field in pendingChange) {
      return pendingChange[field as keyof typeof pendingChange];
    }
    return product[field];
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
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base">
            Gestiona tu catálogo de productos
          </p>
        </div>
        
        {/* Action Buttons - Responsive Grid */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
          <Button 
            variant="ghost"
            size="sm"
            onClick={refresh}
            title="Actualizar inventario"
            className="h-9"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Actualizar</span>
          </Button>
          
          {editMode && (
            <>
              <Button 
                variant="default"
                size="sm"
                onClick={handleSavePendingChanges}
                disabled={pendingChanges.size === 0}
                className="h-9"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Guardar ({pendingChanges.size})</span>
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleCancelChanges}
                className="h-9"
              >
                <X className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Cancelar</span>
              </Button>
            </>
          )}
          
          <Button 
            variant={editMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="h-9"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">{editMode ? "Editando" : "Editar"}</span>
          </Button>
          
          <ExcelImport onImport={handleBulkImport} />
          
          <ProductDialog 
            onSave={handleAddProduct}
            product={editingProduct}
            onUpdate={handleUpdateProduct}
            onClose={() => setEditingProduct(undefined)}
          />
        </div>
      </div>

      {/* Stats Cards - Responsive */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">
                  Total Productos
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1">
                  {products.length}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div>
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Valor Total</p>
              <p className="text-base sm:text-lg md:text-xl font-bold mt-0.5 sm:mt-1 text-success truncate">
                ${products.reduce((sum, item) => sum + (item.stock * item.cost), 0).toLocaleString('es-CL')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div>
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Stock Bajo</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1 text-destructive">
                {products.filter(item => item.stock < 10).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div>
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Categorías</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1">
                {new Set(products.map(item => item.category)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg md:text-xl">Lista de Productos</CardTitle>
            <div className="relative w-full md:w-72">
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Producto</TableHead>
                <TableHead className="min-w-[100px]">SKU</TableHead>
                <TableHead className="min-w-[120px]">Categoría</TableHead>
                <TableHead className="min-w-[100px]">Stock</TableHead>
                <TableHead className="min-w-[100px]">Costo</TableHead>
                <TableHead className="min-w-[100px]">Precio</TableHead>
                <TableHead className="min-w-[120px]">Promoción</TableHead>
                <TableHead className="min-w-[80px]">Margen</TableHead>
                <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const margin = ((item.price - item.cost) / item.price * 100).toFixed(1);
                return (
                  <TableRow key={item.id} className={pendingChanges.has(item.id) ? "bg-accent/50" : ""}>
                    <TableCell className="font-medium">
                      {editMode ? (
                        <EditableCell 
                          value={getDisplayValue(item, 'name') as string} 
                          onSave={(value) => handleCellUpdate(item.id, 'name', value)}
                        />
                      ) : (
                        item.name
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      {editMode ? (
                        <EditableCell 
                          value={getDisplayValue(item, 'category') as string} 
                          onSave={(value) => handleCellUpdate(item.id, 'category', value)}
                        />
                      ) : (
                        item.category
                      )}
                    </TableCell>
                    <TableCell>
                      {editMode ? (
                        <EditableCell 
                          value={getDisplayValue(item, 'stock') as number} 
                          type="number"
                          onSave={(value) => handleCellUpdate(item.id, 'stock', value)}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.stock}</span>
                          {getStockBadge(item.stock)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editMode ? (
                        <EditableCell 
                          value={getDisplayValue(item, 'cost') as number} 
                          type="number"
                          onSave={(value) => handleCellUpdate(item.id, 'cost', value)}
                        />
                      ) : (
                        `$${item.cost.toLocaleString('es-CL')}`
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {editMode ? (
                        <EditableCell 
                          value={getDisplayValue(item, 'price') as number} 
                          type="number"
                          onSave={(value) => handleCellUpdate(item.id, 'price', value)}
                        />
                      ) : (
                        `$${item.price.toLocaleString('es-CL')}`
                      )}
                    </TableCell>
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
