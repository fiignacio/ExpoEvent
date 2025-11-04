import { useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Package, Tag, DollarSign, Smartphone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Product, CartItem } from "@/types/product";
import { calculatePromotionDiscount, getPromotionLabel } from "@/utils/promotions";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";

type PaymentMethod = "efectivo" | "debito" | "credito" | "transferencia";

export default function POS() {
  const { products, loading } = useProducts();
  const { settings } = useSettings();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [receivedAmount, setReceivedAmount] = useState("");

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando productos...</div>
      </div>
    );
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    
    // Verificar stock disponible
    if (currentQuantity + 1 > product.stock) {
      toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles`);
      return;
    }

    if (existingItem) {
      const newCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setCart(newCart);
      checkPromotion(newCart, product.id);
    } else {
      const newItem: CartItem = { 
        ...product, 
        quantity: 1,
        originalPrice: product.price,
        appliedDiscount: 0
      };
      const newCart = [...cart, newItem];
      setCart(newCart);
      checkPromotion(newCart, product.id);
    }
    toast.success(`${product.name} agregado al carrito`);
  };

  const checkPromotion = (currentCart: CartItem[], productId: string) => {
    const item = currentCart.find(i => i.id === productId);
    if (!item || !item.promotion) return;

    const discount = calculatePromotionDiscount(item);
    
    if (discount > 0 && item.appliedDiscount !== discount) {
      setCart(currentCart.map(i => 
        i.id === productId 
          ? { ...i, appliedDiscount: discount }
          : i
      ));
      
      const promoLabel = getPromotionLabel(item);
      if (item.promotion.type === "bulk" && item.quantity >= (item.promotion.quantity || 0)) {
        toast.success(`¡Promoción aplicada! ${promoLabel}`);
      }
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    
    // Verificar stock disponible al aumentar cantidad
    if (delta > 0 && newQuantity > item.stock) {
      toast.error(`Stock insuficiente. Solo hay ${item.stock} unidades disponibles`);
      return;
    }

    const newCart = cart.map(cartItem => {
      if (cartItem.id === id) {
        return newQuantity > 0 ? { ...cartItem, quantity: newQuantity } : cartItem;
      }
      return cartItem;
    }).filter(cartItem => cartItem.quantity > 0);
    
    setCart(newCart);
    checkPromotion(newCart, id);
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    toast.info("Producto eliminado");
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscounts = cart.reduce((sum, item) => sum + (item.appliedDiscount || 0), 0);
  const subtotalAfterDiscounts = subtotal - totalDiscounts;
  const taxRate = (settings?.tax_rate || 0) / 100;
  const tax = taxRate > 0 ? subtotalAfterDiscounts * taxRate : 0;
  const total = subtotalAfterDiscounts + tax;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    if (paymentMethod === "efectivo") {
      const received = parseFloat(receivedAmount);
      if (!received || received < total) {
        toast.error("El monto recibido es insuficiente");
        return;
      }
    }

    try {
      // Actualizar stock de cada producto en el carrito
      for (const item of cart) {
        const newStock = (item.stock || 0) - item.quantity;
        
        if (newStock < 0) {
          toast.error(`Stock insuficiente para ${item.name}`);
          return;
        }

        const { error } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id);

        if (error) throw error;
      }

      // Mostrar mensaje de éxito según método de pago
      if (paymentMethod === "efectivo") {
        const received = parseFloat(receivedAmount);
        const change = received - total;
        toast.success(`Venta procesada. Cambio: $${change.toFixed(2)}`);
      } else {
        const methodNames = {
          debito: "Tarjeta de Débito",
          credito: "Tarjeta de Crédito",
          transferencia: "Transferencia"
        };
        toast.success(`Venta procesada con ${methodNames[paymentMethod]}: $${total.toFixed(2)}`);
      }

      setCart([]);
      setShowPaymentDialog(false);
      setReceivedAmount("");
      setPaymentMethod("efectivo");
    } catch (error: any) {
      toast.error("Error al procesar la venta: " + error.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4 overflow-auto">
        <div>
          <h1 className="text-3xl font-bold">Punto de Venta</h1>
          <p className="text-muted-foreground mt-1">Selecciona productos para agregar al carrito</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
              <Card
              key={product.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 relative"
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-6">
                {product.promotion && (
                  <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
                    <Tag className="w-3 h-3 mr-1" />
                    {getPromotionLabel(product)}
                  </Badge>
                )}
                <div className="aspect-square bg-gradient-subtle rounded-lg mb-4 flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                <p className="text-xl font-bold text-success">${product.price.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Carrito de Compra</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 overflow-auto space-y-3 mb-6">
              {cart.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-center">
                    El carrito está vacío<br />
                    <span className="text-sm">Agrega productos para comenzar</span>
                  </p>
                </div>
              ) : (
                cart.map(item => {
                  const itemSubtotal = item.price * item.quantity;
                  const itemDiscount = item.appliedDiscount || 0;
                  const itemTotal = itemSubtotal - itemDiscount;
                  
                  return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        {item.promotion && (
                          <Badge variant="outline" className="text-xs">
                            {getPromotionLabel(item)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                        {itemDiscount > 0 && (
                          <p className="text-xs text-success font-semibold">
                            -${itemDiscount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold">
                        Total: ${itemTotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
                })
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {totalDiscounts > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-success">Descuentos</span>
                  <span className="font-medium text-success">-${totalDiscounts.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    IVA ({(taxRate * 100).toFixed(0)}%)
                  </span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-success">${total.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-gradient-success hover:opacity-90"
                size="lg"
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Cobrar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
            <DialogDescription>
              Total a cobrar: <span className="font-bold text-lg text-success">${total.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Método de Pago</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="efectivo" id="efectivo" />
                  <Label htmlFor="efectivo" className="flex items-center gap-2 cursor-pointer flex-1">
                    <DollarSign className="w-5 h-5 text-success" />
                    <span>Efectivo</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="debito" id="debito" />
                  <Label htmlFor="debito" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span>Tarjeta de Débito</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="credito" id="credito" />
                  <Label htmlFor="credito" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span>Tarjeta de Crédito</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="transferencia" id="transferencia" />
                  <Label htmlFor="transferencia" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span>Transferencia</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === "efectivo" && (
              <div className="space-y-2">
                <Label htmlFor="received">Monto Recibido</Label>
                <Input
                  id="received"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  autoFocus
                />
                {receivedAmount && parseFloat(receivedAmount) >= total && (
                  <p className="text-sm text-muted-foreground">
                    Cambio: <span className="font-bold text-success">${(parseFloat(receivedAmount) - total).toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={processPayment} className="flex-1 bg-gradient-success">
                Confirmar Pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
