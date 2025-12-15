import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCashSessions } from "@/hooks/useCashSessions";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, CreditCard, Banknote, TrendingUp, TrendingDown, Package, Trash2, Edit, X, Save, Minus, Plus, Search } from "lucide-react";

interface Sale {
  id: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  items: any[];
  created_at: string;
  change_amount?: number;
}

interface CashSessionDetailProps {
  sessionId: string | null;
  sessionData: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashSessionDetail({ sessionId, sessionData, open, onOpenChange }: CashSessionDetailProps) {
  const { fetchSessionSales } = useCashSessions();
  const { role } = useAuth();
  const { products } = useProducts();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Edit sale state
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [editedPaymentMethod, setEditedPaymentMethod] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Add product state
  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);

  useEffect(() => {
    if (sessionId && open) {
      loadSales();
    }
  }, [sessionId, open]);

  const loadSales = async () => {
    if (!sessionId) return;
    setLoading(true);
    const data = await fetchSessionSales(sessionId);
    setSales(data);
    setLoading(false);
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.")) return;
    
    setDeletingId(saleId);
    try {
      // Find the sale to get items and revert stock
      const saleToDelete = sales.find(s => s.id === saleId);
      if (saleToDelete) {
        // Revert stock for deleted items
        for (const item of saleToDelete.items) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock + item.quantity })
              .eq('id', item.id);
          }
        }
      }

      const { error } = await supabase
        .from('offline_sales')
        .delete()
        .eq('id', saleId);
      
      if (error) throw error;
      
      toast.success("Venta eliminada correctamente");
      loadSales();
    } catch (error: any) {
      toast.error("Error al eliminar la venta: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditedItems(sale.items.map(item => ({ ...item })));
    setEditedPaymentMethod(sale.payment_method);
  };

  const cancelEdit = () => {
    setEditingSale(null);
    setEditedItems([]);
    setEditedPaymentMethod("");
  };

  const updateItemQuantity = (index: number, delta: number) => {
    setEditedItems(prev => {
      const newItems = [...prev];
      const newQuantity = Math.max(0, newItems[index].quantity + delta);
      if (newQuantity === 0) {
        return newItems.filter((_, i) => i !== index);
      }
      newItems[index] = { ...newItems[index], quantity: newQuantity };
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
  };

  const addProductToEdit = (product: any) => {
    const existingIndex = editedItems.findIndex(item => item.id === product.id);
    
    if (existingIndex >= 0) {
      // Si ya existe, aumentar cantidad
      updateItemQuantity(existingIndex, 1);
    } else {
      // Si no existe, agregar nuevo item
      setEditedItems(prev => [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        originalPrice: product.price,
        appliedDiscount: 0,
        stock: product.stock
      }]);
    }
    
    setProductSearch("");
    setShowProductList(false);
    toast.success(`${product.name} agregado a la venta`);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 5);

  const handleSaveEdit = async () => {
    if (!editingSale || editedItems.length === 0) {
      toast.error("La venta debe tener al menos un producto");
      return;
    }

    setSaving(true);
    try {
      // 1. Calculate stock differences
      const originalItems = editingSale.items;
      
      // Revert original stock
      for (const item of originalItems) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();
        
        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock + item.quantity })
            .eq('id', item.id);
        }
      }

      // Apply new stock
      for (const item of editedItems) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();
        
        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock - item.quantity })
            .eq('id', item.id);
        }
      }

      // 2. Calculate new totals
      const newSubtotal = editedItems.reduce((sum, item) => {
        const price = item.appliedDiscount ? item.originalPrice - item.appliedDiscount : item.price;
        return sum + (price * item.quantity);
      }, 0);
      const newTotal = newSubtotal; // Assuming tax is included or handled elsewhere

      // 3. Update sale
      const { error } = await supabase
        .from('offline_sales')
        .update({
          items: editedItems,
          subtotal: newSubtotal,
          total: newTotal,
          payment_method: editedPaymentMethod
        })
        .eq('id', editingSale.id);

      if (error) throw error;

      toast.success("Venta actualizada correctamente");
      cancelEdit();
      loadSales();
    } catch (error: any) {
      toast.error("Error al actualizar la venta: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const paymentMethodStats = sales.reduce((acc, sale) => {
    acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total;
    return acc;
  }, {} as Record<string, number>);

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const difference = sessionData?.final_amount ? sessionData.final_amount - sessionData.initial_amount : 0;
  const expectedAmount = sessionData?.initial_amount + totalSales;
  const cashDifference = sessionData?.final_amount ? sessionData.final_amount - expectedAmount : 0;

  const editedTotal = editedItems.reduce((sum, item) => {
    const price = item.appliedDiscount ? item.originalPrice - item.appliedDiscount : item.price;
    return sum + (price * item.quantity);
  }, 0);

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'efectivo':
        return <Banknote className="w-4 h-4" />;
      case 'tarjeta':
      case 'debito':
      case 'credito':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Detalle de Sesión de Caja</DialogTitle>
          <DialogDescription>
            {sessionData?.profiles?.full_name} - {sessionData?.opened_at && format(new Date(sessionData.opened_at), "PPP 'a las' HH:mm", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6">
            {/* Resumen de la Sesión */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" />
                    Monto Inicial
                  </div>
                  <div className="text-2xl font-bold">
                    ${sessionData?.initial_amount?.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" />
                    Monto Final
                  </div>
                  <div className="text-2xl font-bold">
                    {sessionData?.final_amount ? `$${sessionData.final_amount.toFixed(2)}` : 'N/A'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    {difference >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    Diferencia
                  </div>
                  <div className={`text-2xl font-bold ${difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ${Math.abs(difference).toFixed(2)} {difference >= 0 ? '(+)' : '(-)'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Análisis de Diferencia */}
            {sessionData?.status === 'closed' && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Análisis de Caja</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto Inicial:</span>
                      <span className="font-medium">${sessionData.initial_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ventas Totales:</span>
                      <span className="font-medium text-success">+${totalSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Monto Esperado:</span>
                      <span className="font-semibold">${expectedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto Real:</span>
                      <span className="font-semibold">${sessionData.final_amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Diferencia de Caja:</span>
                      <span className={`font-bold ${Math.abs(cashDifference) < 0.01 ? 'text-success' : 'text-destructive'}`}>
                        {Math.abs(cashDifference) < 0.01 ? '✓ Cuadrada' : `${cashDifference >= 0 ? '+' : ''}$${cashDifference.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Métodos de Pago */}
            <div>
              <h3 className="font-semibold mb-3">Métodos de Pago</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(paymentMethodStats).map(([method, amount]) => (
                  <Card key={method}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(method)}
                          <span className="font-medium capitalize">{method}</span>
                        </div>
                        <span className="text-lg font-bold text-success">
                          ${amount.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Lista de Transacciones */}
            <div>
              <h3 className="font-semibold mb-3">
                Transacciones ({sales.length})
              </h3>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center text-muted-foreground py-8">
                    Cargando transacciones...
                  </div>
                ) : sales.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No hay transacciones en esta sesión
                    </CardContent>
                  </Card>
                ) : (
                  sales.map((sale) => (
                    <Card key={sale.id} className={editingSale?.id === sale.id ? "border-primary" : ""}>
                      <CardContent className="p-4">
                        {editingSale?.id === sale.id ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">Editando Venta</h4>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={saving || editedItems.length === 0}
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  {saving ? "Guardando..." : "Guardar"}
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Método de Pago</Label>
                              <Select value={editedPaymentMethod} onValueChange={setEditedPaymentMethod}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="efectivo">Efectivo</SelectItem>
                                  <SelectItem value="debito">Débito</SelectItem>
                                  <SelectItem value="credito">Crédito</SelectItem>
                                  <SelectItem value="transferencia">Transferencia</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Agregar Producto</Label>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                  placeholder="Buscar producto para agregar..."
                                  value={productSearch}
                                  onChange={(e) => {
                                    setProductSearch(e.target.value);
                                    setShowProductList(e.target.value.length > 0);
                                  }}
                                  onFocus={() => productSearch.length > 0 && setShowProductList(true)}
                                  className="pl-10"
                                />
                                {showProductList && filteredProducts.length > 0 && (
                                  <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-auto">
                                    {filteredProducts.map(product => (
                                      <div
                                        key={product.id}
                                        className="p-2 hover:bg-accent cursor-pointer flex justify-between items-center"
                                        onClick={() => addProductToEdit(product)}
                                      >
                                        <div>
                                          <span className="text-sm font-medium">{product.name}</span>
                                          <span className="text-xs text-muted-foreground ml-2">{product.sku}</span>
                                        </div>
                                        <span className="text-sm font-bold text-success">${product.price.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Productos en la venta</Label>
                              {editedItems.length === 0 ? (
                                <p className="text-sm text-destructive">Debe haber al menos un producto</p>
                              ) : (
                                 editedItems.map((item, index) => (
                                   <div key={index} className="flex items-center justify-between bg-accent/50 p-2 rounded-lg">
                                     <div className="flex-1">
                                       <span className="text-sm font-medium">{item.name}</span>
                                       <span className="text-xs text-muted-foreground ml-2">
                                         ${item.price.toFixed(2)} c/u
                                       </span>
                                     </div>
                                     <div className="flex items-center gap-2">
                                       <Button
                                         variant="outline"
                                         size="icon"
                                         className="h-7 w-7"
                                         onClick={() => updateItemQuantity(index, -1)}
                                       >
                                         <Minus className="w-3 h-3" />
                                       </Button>
                                       <span className="w-8 text-center font-medium">{item.quantity}</span>
                                       <Button
                                         variant="outline"
                                         size="icon"
                                         className="h-7 w-7"
                                         onClick={() => updateItemQuantity(index, 1)}
                                       >
                                         <Plus className="w-3 h-3" />
                                       </Button>
                                       <Button
                                         variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                        onClick={() => removeItem(index)}
                                        title="Eliminar producto"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="flex justify-between pt-2 border-t">
                              <span className="font-semibold">Nuevo Total:</span>
                              <span className="font-bold text-success">${editedTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="capitalize">
                                    {sale.payment_method}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(sale.created_at), "HH:mm", { locale: es })}
                                  </span>
                                </div>
                                {sale.payment_method.toLowerCase() === 'efectivo' && sale.change_amount && sale.change_amount > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Vuelto entregado: ${sale.change_amount.toFixed(2)}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-xl font-bold text-success">
                                    ${sale.total.toFixed(2)}
                                  </div>
                                </div>
                                {role === 'admin' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-primary hover:bg-primary/10"
                                      onClick={() => startEditSale(sale)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteSale(sale.id)}
                                      disabled={deletingId === sale.id}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {sale.items.map((item: any, index: number) => {
                                const itemTotal = item.price * item.quantity;
                                const discount = item.appliedDiscount || 0;
                                const finalPrice = itemTotal - discount;
                                const hasPromotion = discount > 0;
                                
                                return (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Package className="w-3 h-3 text-muted-foreground" />
                                      <span>{item.name}</span>
                                      <span className="text-muted-foreground">x{item.quantity}</span>
                                      {hasPromotion && item.promotion && (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                          {item.promotion.quantity}x${item.promotion.discountedPrice?.toLocaleString()}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      {hasPromotion ? (
                                        <div className="flex flex-col items-end">
                                          <span className="font-medium text-success">
                                            ${finalPrice.toLocaleString()}
                                          </span>
                                          <span className="text-xs text-muted-foreground line-through">
                                            ${itemTotal.toLocaleString()}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="font-medium">
                                          ${itemTotal.toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}