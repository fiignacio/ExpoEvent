import { useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Product, CartItem } from "@/types/product";
import { calculatePromotionDiscount, getPromotionLabel } from "@/utils/promotions";

const mockProducts: Product[] = [
  { 
    id: "1", 
    name: "Café Americano", 
    sku: "BEB-001",
    price: 4.00, 
    cost: 2.00,
    stock: 150,
    category: "Bebidas",
    promotion: {
      type: "bulk",
      quantity: 3,
      discountedPrice: 10.00
    }
  },
  { id: "2", name: "Croissant", sku: "PAN-001", price: 4.50, cost: 1.80, stock: 45, category: "Panadería" },
  { id: "3", name: "Capuccino", sku: "BEB-002", price: 6.00, cost: 3.00, stock: 120, category: "Bebidas" },
  { id: "4", name: "Jugo Naranja", sku: "BEB-003", price: 4.00, cost: 1.50, stock: 8, category: "Bebidas" },
  { id: "5", name: "Sándwich", sku: "COM-001", price: 8.50, cost: 4.00, stock: 30, category: "Comida" },
  { id: "6", name: "Ensalada", sku: "COM-002", price: 7.00, cost: 3.50, stock: 25, category: "Comida" },
];

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
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
    const newCart = cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0);
    
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
  const tax = subtotalAfterDiscounts * 0.16;
  const total = subtotalAfterDiscounts + tax;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    toast.success(`Venta procesada: $${total.toFixed(2)}`);
    setCart([]);
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (16%)</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
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
    </div>
  );
}
