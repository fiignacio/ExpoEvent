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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">Bajo</Badge>;
    } else if (stock < 50) {
      return <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5 py-0.5">Medio</Badge>;
    } else {
      return <Badge className="bg-success text-success-foreground text-[10px] px-1.5 py-0.5">Alto</Badge>;
    }
  };

  // Mobile Product Card Component
  const ProductCard = ({ item }: { item: Product }) => {
    const margin = ((item.price - item.cost) / item.price * 100).toFixed(1);
    
    return (
      <Card className={`${pendingChanges.has(item.id) ? "border-primary" : ""}`}>
        <CardContent className="p-3">
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{item.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditingProduct(item)}
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará "{item.name}" del inventario. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(item.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
            <div>
              <span className="text-muted-foreground block">Stock</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{item.stock}</span>
                {getStockBadge(item.stock)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block">Costo</span>
              <span className="font-medium">${item.cost.toLocaleString('es-CL')}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Precio</span>
              <span className="font-semibold">${item.price.toLocaleString('es-CL')}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
              {item.promotion && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Tag className="w-2.5 h-2.5" />
                  {getPromotionLabel(item)}
                </Badge>
              )}
            </div>
            <span className="text-success font-medium">{margin}%</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-2 sm:p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Gestiona tu catálogo de productos
          </p>
        </div>
        
        {/* Action Buttons - Compact for mobile */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button 
            variant="ghost"
            size="sm"
            onClick={refresh}
            title="Actualizar"
            className="h-8 px-2 sm:px-3"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline ml-1.5">Actualizar</span>
          </Button>
          
          {editMode && (
            <>
              <Button 
                variant="default"
                size="sm"
                onClick={handleSavePendingChanges}
                disabled={pendingChanges.size === 0}
                className="h-8 px-2 sm:px-3"
              >
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="ml-1 sm:ml-1.5 text-xs sm:text-sm">
                  {pendingChanges.size > 0 && `(${pendingChanges.size})`}
                </span>
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleCancelChanges}
                className="h-8 px-2 sm:px-3"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          
          <Button 
            variant={editMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="h-8 px-2 sm:px-3"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline ml-1.5">{editMode ? "Editando" : "Editar"}</span>
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

      {/* Stats Cards - Compact */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-2.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Total Productos
                </p>
                <p className="text-base sm:text-xl font-bold">
                  {products.length}
                </p>
              </div>
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Package className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Valor Total</p>
              <p className="text-sm sm:text-lg font-bold text-success truncate">
                ${products.reduce((sum, item) => sum + (item.stock * item.cost), 0).toLocaleString('es-CL')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Stock Bajo</p>
              <p className="text-base sm:text-xl font-bold text-destructive">
                {products.filter(item => item.stock < 10).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Categorías</p>
              <p className="text-base sm:text-xl font-bold">
                {new Set(products.map(item => item.category)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Mobile & Tablet: Card View */}
      <div className="lg:hidden space-y-2">
        {filteredInventory.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No se encontraron productos</p>
        ) : (
          filteredInventory.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Desktop: Table View */}
      <Card className="hidden lg:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Lista de Productos ({filteredInventory.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Producto</TableHead>
                <TableHead className="min-w-[90px]">SKU</TableHead>
                <TableHead className="min-w-[100px]">Categoría</TableHead>
                <TableHead className="min-w-[100px]">Stock</TableHead>
                <TableHead className="min-w-[80px]">Costo</TableHead>
                <TableHead className="min-w-[80px]">Precio</TableHead>
                <TableHead className="min-w-[100px]">Promoción</TableHead>
                <TableHead className="min-w-[60px]">Margen</TableHead>
                <TableHead className="text-right min-w-[90px]">Acciones</TableHead>
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
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>
                      {editMode ? (
                        <EditableCell 
                          value={getDisplayValue(item, 'category') as string} 
                          onSave={(value) => handleCellUpdate(item.id, 'category', value)}
                        />
                      ) : (
                        <span className="text-sm">{item.category}</span>
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm">{item.stock}</span>
                          {getStockBadge(item.stock)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
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
                    <TableCell className="font-semibold text-sm">
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
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Tag className="w-3 h-3" />
                          {getPromotionLabel(item)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-success text-sm">{margin}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingProduct(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará "{item.name}" del inventario. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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