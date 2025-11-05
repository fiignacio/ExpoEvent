import { useState, useEffect } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Package, Tag, DollarSign, Smartphone, Building2, ShoppingCart, X, Lock } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Product, CartItem } from "@/types/product";
import { calculatePromotionDiscount, getPromotionLabel } from "@/utils/promotions";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { useCashRegister } from "@/hooks/useCashRegister";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useAuth } from "@/hooks/useAuth";
import { OpenCashDialog } from "@/components/OpenCashDialog";
import { CloseCashDialog } from "@/components/CloseCashDialog";
import { supabase } from "@/integrations/supabase/client";

type PaymentMethod = "efectivo" | "debito" | "credito" | "transferencia";

interface CartSession {
  id: string;
  name: string;
  items: CartItem[];
}

const STORAGE_KEY = "pos_cart_sessions";

export default function POS() {
  const { products, loading } = useProducts();
  const { settings } = useSettings();
  const { currentSession, loading: sessionLoading, openSession, closeSession: closeCashSession } = useCashRegister();
  const { isOnline, isSyncing, pendingSales, addOfflineSale } = useOfflineSync();
  const { signOut, user } = useAuth();
  const [cartSessions, setCartSessions] = useState<CartSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [showCloseCashDialog, setShowCloseCashDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [receivedAmount, setReceivedAmount] = useState("");

  // Cargar sesiones desde localStorage al iniciar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const sessions = JSON.parse(stored);
      setCartSessions(sessions);
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      }
    } else {
      // Crear primera sesión
      const firstSession: CartSession = {
        id: crypto.randomUUID(),
        name: "Venta 1",
        items: []
      };
      setCartSessions([firstSession]);
      setActiveSessionId(firstSession.id);
    }
  }, []);

  // Guardar sesiones en localStorage cuando cambien
  useEffect(() => {
    if (cartSessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartSessions));
    }
  }, [cartSessions]);

  const activeSession = cartSessions.find(s => s.id === activeSessionId);
  const cart = activeSession?.items || [];

  const setCart = (newCart: CartItem[]) => {
    setCartSessions(prev => prev.map(session => 
      session.id === activeSessionId 
        ? { ...session, items: newCart }
        : session
    ));
  };

  const createNewSession = () => {
    const newSession: CartSession = {
      id: crypto.randomUUID(),
      name: `Venta ${cartSessions.length + 1}`,
      items: []
    };
    setCartSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    toast.success("Nuevo carrito creado");
  };

  const closeCartSession = (sessionId: string) => {
    if (cartSessions.length === 1) {
      toast.error("No puedes cerrar el último carrito");
      return;
    }
    const sessionToClose = cartSessions.find(s => s.id === sessionId);
    if (sessionToClose && sessionToClose.items.length > 0) {
      toast.error("No puedes cerrar un carrito con productos");
      return;
    }
    const newSessions = cartSessions.filter(s => s.id !== sessionId);
    setCartSessions(newSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(newSessions[0].id);
    }
    toast.info("Carrito cerrado");
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!sessionLoading && !currentSession) {
      setShowOpenCashDialog(true);
    }
  }, [sessionLoading, currentSession]);

  const handleOpenCash = async (initialAmount: number) => {
    await openSession(initialAmount);
  };

  const handleCloseCash = async (finalAmount: number) => {
    const success = await closeCashSession(finalAmount);
    if (success) {
      await signOut();
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <div className="text-xl font-semibold">Caja Cerrada</div>
        <p className="text-muted-foreground">Abre la caja para comenzar a vender</p>
        <OpenCashDialog
          open={showOpenCashDialog}
          onOpenChange={setShowOpenCashDialog}
          onConfirm={handleOpenCash}
        />
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
      if (!isOnline) {
        // Modo offline: guardar venta para sincronización posterior
        addOfflineSale({
          sessionId: currentSession?.id || null,
          items: cart,
          subtotal: subtotalAfterDiscounts,
          tax,
          total,
          paymentMethod
        });

        // Actualizar stock localmente
        cart.forEach(item => {
          const productIndex = products.findIndex(p => p.id === item.id);
          if (productIndex !== -1) {
            products[productIndex].stock -= item.quantity;
          }
        });

        if (paymentMethod === "efectivo") {
          const received = parseFloat(receivedAmount);
          const change = received - total;
          toast.success(`Venta guardada (offline). Cambio: $${change.toFixed(2)}`);
        } else {
          toast.success("Venta guardada para sincronización");
        }
      } else {
        // Modo online: procesar normalmente
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

        // Guardar venta en la base de datos
        const { error: saleError } = await supabase
          .from('offline_sales')
          .insert([{
            user_id: user?.id || '',
            session_id: currentSession?.id || null,
            items: cart as any,
            subtotal: subtotalAfterDiscounts,
            tax,
            total,
            payment_method: paymentMethod,
            synced: true,
            synced_at: new Date().toISOString()
          }]);

        if (saleError) throw saleError;

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
      }

      // Limpiar carrito actual
      setCart([]);
      
      if (cartSessions.length > 1) {
        closeCartSession(activeSessionId);
      }
      
      setShowPaymentDialog(false);
      setReceivedAmount("");
      setPaymentMethod("efectivo");
    } catch (error: any) {
      toast.error("Error al procesar la venta: " + error.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-h-[calc(100vh-10rem)] pb-20 md:pb-0">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-3 md:space-y-4 overflow-auto">
        {/* Header con estado de conexión y botón cerrar caja */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
              {isOnline ? "En línea" : "Sin conexión"}
            </Badge>
            {pendingSales.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {pendingSales.length} venta(s) pendiente(s)
              </Badge>
            )}
            {isSyncing && (
              <Badge variant="secondary" className="text-xs">
                Sincronizando...
              </Badge>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowCloseCashDialog(true)}
          >
            Cerrar Caja
          </Button>
        </div>

        {/* Tabs para múltiples carritos */}
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border">
          <Tabs value={activeSessionId} onValueChange={setActiveSessionId} className="flex-1">
            <TabsList className="h-auto flex-wrap justify-start">
              {cartSessions.map((session) => (
                <TabsTrigger 
                  key={session.id} 
                  value={session.id}
                  className="relative pr-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm"
                >
                  <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">{session.name}</span>
                  <span className="sm:hidden">{session.name.split(' ')[1]}</span>
                  {session.items.length > 0 && (
                    <Badge className="ml-1 md:ml-2 h-4 md:h-5 min-w-4 md:min-w-5 px-1 text-xs">{session.items.length}</Badge>
                  )}
                  {cartSessions.length > 1 && session.items.length === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 md:h-6 md:w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeCartSession(session.id);
                      }}
                    >
                      <X className="w-2 h-2 md:w-3 md:h-3" />
                    </Button>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={createNewSession}
            className="whitespace-nowrap text-xs md:text-sm"
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Nuevo Carrito</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Punto de Venta</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Selecciona productos para agregar al carrito</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 md:pl-10 text-sm md:text-base"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {filteredProducts.map(product => (
              <Card
              key={product.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 relative"
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-3 md:p-6">
                {product.promotion && (
                  <Badge className="absolute top-1 right-1 md:top-2 md:right-2 bg-warning text-warning-foreground text-[10px] md:text-xs">
                    <Tag className="w-2 h-2 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                    <span className="hidden sm:inline">{getPromotionLabel(product)}</span>
                    <span className="sm:hidden">PROMO</span>
                  </Badge>
                )}
                <div className="aspect-square bg-gradient-subtle rounded-lg mb-2 md:mb-4 flex items-center justify-center">
                  <Package className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-sm md:text-lg line-clamp-2">{product.name}</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">{product.category}</p>
                <p className="text-base md:text-xl font-bold text-success">${product.price.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-lg md:text-xl">Carrito de Compra</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col px-3 md:px-6">
            <div className="flex-1 overflow-auto space-y-2 md:space-y-3 mb-4 md:mb-6">
              {cart.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-center text-sm md:text-base">
                    El carrito está vacío<br />
                    <span className="text-xs md:text-sm">Agrega productos para comenzar</span>
                  </p>
                </div>
              ) : (
                cart.map(item => {
                  const itemSubtotal = item.price * item.quantity;
                  const itemDiscount = item.appliedDiscount || 0;
                  const itemTotal = itemSubtotal - itemDiscount;
                  
                  return (
                  <div key={item.id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-accent">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 md:gap-2">
                        <p className="font-medium text-sm md:text-base truncate">{item.name}</p>
                        {item.promotion && (
                          <Badge variant="outline" className="text-[10px] md:text-xs flex-shrink-0">
                            <span className="hidden sm:inline">{getPromotionLabel(item)}</span>
                            <span className="sm:hidden">P</span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        <p className="text-xs md:text-sm text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                        {itemDiscount > 0 && (
                          <p className="text-[10px] md:text-xs text-success font-semibold">
                            -${itemDiscount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <p className="text-xs md:text-sm font-semibold">
                        Total: ${itemTotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 md:h-8 md:w-8"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                      <span className="w-6 md:w-8 text-center font-semibold text-xs md:text-base">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 md:h-8 md:w-8"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 md:h-8 md:w-8 text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                );
                })
              )}
            </div>

            <div className="space-y-2 md:space-y-3 border-t pt-3 md:pt-4">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {totalDiscounts > 0 && (
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-success">Descuentos</span>
                  <span className="font-medium text-success">-${totalDiscounts.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-muted-foreground">
                    IVA ({(taxRate * 100).toFixed(0)}%)
                  </span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg md:text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-success">${total.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-gradient-success hover:opacity-90 text-sm md:text-base"
                size="lg"
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                <CreditCard className="w-4 h-4 md:w-5 md:h-5 mr-2" />
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

      {/* Diálogos de apertura/cierre de caja */}
      <OpenCashDialog
        open={showOpenCashDialog}
        onOpenChange={setShowOpenCashDialog}
        onConfirm={handleOpenCash}
      />
      <CloseCashDialog
        open={showCloseCashDialog}
        onOpenChange={setShowCloseCashDialog}
        onConfirm={handleCloseCash}
        initialAmount={currentSession?.initial_amount || 0}
      />
    </div>
  );
}
