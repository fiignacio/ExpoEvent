import { useState, useEffect, useRef } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Package, Tag, DollarSign, Smartphone, Building2, ShoppingCart, X, Lock, User, Banknote, CircleDollarSign, RotateCcw, Wallet, Keyboard } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Product, CartItem } from "@/types/product";
import { calculatePromotionDiscount, getPromotionLabel } from "@/utils/promotions";
import { calculateChangeBreakdown, DenominationBreakdown } from "@/utils/changeBreakdown";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { useCashRegister } from "@/hooks/useCashRegister";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useAuth } from "@/hooks/useAuth";
import { useCashSessions } from "@/hooks/useCashSessions";
import { useCustomers } from "@/hooks/useCustomers";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useIsMobile, useIsMobileOrTablet } from "@/hooks/use-mobile";
import { OpenCashDialog } from "@/components/OpenCashDialog";
import { CloseCashDialog } from "@/components/CloseCashDialog";
import { ReturnDialog } from "@/components/ReturnDialog";
import { CashWithdrawalDialog } from "@/components/CashWithdrawalDialog";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useKeyboardShortcuts, ShortcutsHelp } from "@/hooks/useKeyboardShortcuts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type PaymentMethod = "efectivo" | "debito" | "credito" | "transferencia" | "mixto";

interface CartSession {
  id: string;
  name: string;
  items: CartItem[];
}

const STORAGE_KEY = "pos_cart_sessions";

export default function POS() {
  const { products, loading, bulkUpdate } = useProducts();
  const { settings } = useSettings();
  const { currentSession, loading: sessionLoading, openSession, closeSession: closeCashSession } = useCashRegister();
  const { isOnline, isSyncing, pendingSales, addOfflineSale } = useOfflineSync();
  const { signOut, user } = useAuth();
  const { fetchSessionSales } = useCashSessions();
  const { customers } = useCustomers();
  const { currentRate, convertUsdToClp, autoFetch, fetchLiveRate } = useExchangeRate();
  const isMobile = useIsMobile();
  const isMobileOrTablet = useIsMobileOrTablet();
  const [cartSessions, setCartSessions] = useState<CartSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [showCloseCashDialog, setShowCloseCashDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [paymentMethodTotals, setPaymentMethodTotals] = useState({
    efectivo: 0,
    debito: 0,
    credito: 0,
    transferencia: 0,
    mixto: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerPrices, setCustomerPrices] = useState<Map<string, number>>(new Map());
  const [payInUsd, setPayInUsd] = useState(false);
  const [usdAmount, setUsdAmount] = useState("");
  const [mixedCashAmount, setMixedCashAmount] = useState("");
  const [mixedPayInUsd, setMixedPayInUsd] = useState(false);
  const [mixedUsdAmount, setMixedUsdAmount] = useState("");
  const [promoDialogProduct, setPromoDialogProduct] = useState<Product | null>(null);
  const [promoPackCount, setPromoPackCount] = useState(1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Función para normalizar texto (quitar acentos)
  const normalizeText = (text: string): string => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onClearCart: () => {
      if (cart.length > 0) {
        setCart([]);
        toast.info("Carrito limpiado");
      }
    },
    onPendingSale: () => createNewSession(),
    onProcessPayment: () => {
      if (cart.length > 0) {
        setShowPaymentDialog(true);
      } else {
        toast.error("El carrito está vacío");
      }
    },
    onIncrementLast: () => {
      if (cart.length > 0) {
        const lastItem = cart[cart.length - 1];
        const product = products.find(p => p.id === lastItem.id);
        if (product) {
          if (!settings?.allow_negative_stock && lastItem.quantity + 1 > product.stock) {
            toast.error(`Stock insuficiente`);
            return;
          }
          const newCart = cart.map((item, idx) =>
            idx === cart.length - 1 ? { ...item, quantity: item.quantity + 1 } : item
          );
          setCart(newCart);
          checkPromotion(newCart, lastItem.id);
        }
      }
    },
    onDecrementLast: () => {
      if (cart.length > 0) {
        const lastItem = cart[cart.length - 1];
        if (lastItem.quantity > 1) {
          const newCart = cart.map((item, idx) =>
            idx === cart.length - 1 ? { ...item, quantity: item.quantity - 1 } : item
          );
          setCart(newCart);
          checkPromotion(newCart, lastItem.id);
        } else {
          setCart(cart.filter((_, idx) => idx !== cart.length - 1));
          toast.info("Producto eliminado");
        }
      }
    },
    onPaymentMethod: (method) => setPaymentMethod(method),
    onEscape: () => {
      if (showPaymentDialog) setShowPaymentDialog(false);
      else if (showReturnDialog) setShowReturnDialog(false);
      else if (showWithdrawalDialog) setShowWithdrawalDialog(false);
    },
    onEnter: () => {
      if (showPaymentDialog && !isProcessing) {
        processPayment();
      }
    },
    enabled: currentSession !== null
  });

  // Parse quick cash amounts from settings
  const quickCashAmounts = (): number[] => {
    try {
      return JSON.parse(settings?.quick_cash_amounts || "[3000, 5000, 10000, 20000]");
    } catch {
      return [3000, 5000, 10000, 20000];
    }
  };

  // Fetch exchange rate on mount if auto-fetch is enabled
  useEffect(() => {
    if (autoFetch && currentSession) {
      fetchLiveRate(true);
    }
  }, [autoFetch, currentSession]);

  // Cargar precios del cliente cuando se seleccione uno
  useEffect(() => {
    const loadCustomerPrices = async () => {
      if (!selectedCustomerId) {
        setCustomerPrices(new Map());
        return;
      }
      
      // Verificar que el cliente seleccionado sea tipo "cliente" (no "proveedor")
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      if (!selectedCustomer || selectedCustomer.type !== "cliente") {
        setCustomerPrices(new Map());
        return;
      }
      
      const { data } = await supabase
        .from("customer_products")
        .select("product_id, price")
        .eq("customer_id", selectedCustomerId);
      
      if (data) {
        const pricesMap = new Map<string, number>();
        data.forEach(item => pricesMap.set(item.product_id, Number(item.price)));
        setCustomerPrices(pricesMap);
      }
    };
    
    loadCustomerPrices();
  }, [selectedCustomerId, customers]);

  // Actualizar carrito cuando cambien los precios del cliente
  useEffect(() => {
    if (cart.length > 0) {
      const updatedCart = cart.map(item => {
        const customerPrice = customerPrices.get(item.id);
        if (customerPrices.size > 0 && customerPrice !== undefined) {
          return {
            ...item,
            price: customerPrice,
            isCustomerPrice: true
          };
        } else {
          return {
            ...item,
            price: item.originalPrice,
            isCustomerPrice: false
          };
        }
      });
      setCart(updatedCart);
    }
  }, [customerPrices]);

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

  const filteredProducts = products.filter(product => {
    const normalizedSearch = normalizeText(searchTerm);
    return normalizeText(product.name).includes(normalizedSearch) ||
           normalizeText(product.sku).includes(normalizedSearch);
  });

  useEffect(() => {
    if (!sessionLoading && !currentSession) {
      setShowOpenCashDialog(true);
    }
  }, [sessionLoading, currentSession]);

  const handleOpenCash = async (initialAmount: number) => {
    await openSession(initialAmount);
  };

  const handleOpenCloseCashDialog = async () => {
    if (!currentSession) return;
    
    // Obtener ventas de la sesión actual
    const sales = await fetchSessionSales(currentSession.id);
    
    // Calcular totales por método de pago
    const totals = {
      efectivo: 0,
      debito: 0,
      credito: 0,
      transferencia: 0,
      mixto: 0
    };
    
    sales.forEach((sale: any) => {
      const method = sale.payment_method.toLowerCase();
      if (method in totals) {
        totals[method as keyof typeof totals] += sale.total;
      }
    });
    
    setPaymentMethodTotals(totals);
    setShowCloseCashDialog(true);
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

    // Si el producto tiene promoción por cantidad y aún no está en el carrito,
    // preguntar si quiere agregar la promo completa o solo 1 unidad.
    if (
      currentQuantity === 0 &&
      product.promotion?.type === "bulk" &&
      product.promotion.quantity &&
      product.promotion.quantity > 1
    ) {
      setPromoDialogProduct(product);
      return;
    }

    addToCartDirect(product, 1);
  };

  const addToCartDirect = (product: Product, quantityToAdd: number) => {
    const existingItem = cart.find(item => item.id === product.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;

    // Verificar stock disponible (solo si no se permite stock negativo)
    if (!settings?.allow_negative_stock && currentQuantity + quantityToAdd > product.stock) {
      toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles`);
      return;
    }

    // Obtener precio personalizado si existe (solo para clientes)
    const customerPrice = customerPrices.get(product.id);
    const finalPrice = customerPrice ?? product.price;

    let newCart: CartItem[];
    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantityToAdd, stock: product.stock }
          : item
      );
    } else {
      const newItem: CartItem = {
        ...product,
        price: finalPrice,
        quantity: quantityToAdd,
        originalPrice: product.price,
        appliedDiscount: 0,
        isCustomerPrice: customerPrice !== undefined,
      };
      newCart = [...cart, newItem];
    }
    setCart(newCart);
    checkPromotion(newCart, product.id);

    // Mensaje diferente si aplica precio de cliente
    if (customerPrice !== undefined && customerPrice !== product.price) {
      toast.success(`${product.name} agregado con precio especial: $${finalPrice.toLocaleString()}`);
    } else {
      toast.success(`${product.name} agregado al carrito`);
    }
  };

  const checkPromotion = (currentCart: CartItem[], productId: string) => {
    const item = currentCart.find(i => i.id === productId);
    if (!item || !item.promotion) return;

    const discount = calculatePromotionDiscount(item);
    
    // Siempre actualizar el descuento (incluso a 0 si ya no califica)
    if (item.appliedDiscount !== discount) {
      setCart(currentCart.map(i => 
        i.id === productId 
          ? { ...i, appliedDiscount: discount }
          : i
      ));
      
      const promoLabel = getPromotionLabel(item);
      if (discount > 0 && item.promotion.type === "bulk" && item.quantity >= (item.promotion.quantity || 0)) {
        toast.success(`¡Promoción aplicada! ${promoLabel}`);
      } else if (discount === 0 && (item.appliedDiscount || 0) > 0) {
        toast.info("Promoción removida - cantidad mínima no alcanzada");
      }
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    
    // Obtener stock actual del producto
    const currentProduct = products.find(p => p.id === id);
    const currentStock = currentProduct?.stock ?? item.stock;
    
    // Verificar stock disponible al aumentar cantidad (solo si no se permite stock negativo)
    if (delta > 0 && !settings?.allow_negative_stock && newQuantity > currentStock) {
      toast.error(`Stock insuficiente. Solo hay ${currentStock} unidades disponibles`);
      return;
    }

    const newCart = cart
      .map(cartItem =>
        cartItem.id === id
          ? { ...cartItem, quantity: newQuantity, stock: currentStock }
          : cartItem
      )
      .filter(cartItem => cartItem.quantity > 0);

    setCart(newCart);
    if (newQuantity <= 0) {
      toast.info("Producto eliminado");
    } else {
      checkPromotion(newCart, id);
    }
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

  const handlePendingSale = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    if (!selectedCustomerId) {
      toast.error("Selecciona un cliente para registrar la venta pendiente");
      return;
    }

    try {
      // 1. Verificar stock local
      for (const item of cart) {
        const prod = products.find(p => p.id === item.id);
        const currentStock = prod ? Number(prod.stock) : Number(item.stock);
        if (currentStock < item.quantity && !settings?.allow_negative_stock) {
          toast.error(`Stock insuficiente para ${item.name}. Disponible: ${currentStock}`);
          return;
        }
      }

      // 2. Descontar stock del inventario local
      const stockUpdates = cart.map(item => {
        const prod = products.find(p => p.id === item.id);
        const currentStock = prod ? Number(prod.stock) : Number(item.stock);
        return {
          id: item.id,
          data: { stock: Math.max(0, currentStock - item.quantity) }
        };
      });
      await bulkUpdate(stockUpdates);

      // 3. Registrar venta pendiente localmente
      addOfflineSale({
        sessionId: currentSession?.id || null,
        items: cart,
        subtotal: subtotalAfterDiscounts,
        tax,
        total,
        paymentMethod: "pendiente",
        customerId: selectedCustomerId
      } as any);

      toast.success("Venta pendiente registrada en el evento");
      
      // Limpiar carrito
      setCart([]);
      setSelectedCustomerId("");
      
      if (cartSessions.length > 1) {
        closeCartSession(activeSessionId);
      }
    } catch (error: any) {
      toast.error("Error al registrar la venta pendiente: " + error.message);
    }
  };

  const processPayment = async () => {
    if (isProcessing) return; // Prevenir doble clic
    
    let changeAmount = 0;
    let cashAmount = 0;
    let paidInUsd = false;
    let usdAmountPaid = 0;
    let exchangeRateUsed = 0;
    
    if (paymentMethod === "efectivo") {
      const received = parseFloat(receivedAmount);
      if (!received || received < total) {
        toast.error("El monto recibido es insuficiente");
        return;
      }
      changeAmount = received - total;
      cashAmount = total;
      
      if (payInUsd && usdAmount) {
        paidInUsd = true;
        usdAmountPaid = parseFloat(usdAmount);
        exchangeRateUsed = currentRate;
      }
    } else if (paymentMethod === "mixto") {
      const cashPaid = parseFloat(mixedCashAmount);
      if (!cashPaid || cashPaid <= 0 || cashPaid > total) {
        toast.error("Ingresa un monto válido en efectivo (entre $1 y el total)");
        return;
      }
      cashAmount = cashPaid;
      
      if (mixedPayInUsd && mixedUsdAmount) {
        paidInUsd = true;
        usdAmountPaid = parseFloat(mixedUsdAmount);
        exchangeRateUsed = currentRate;
      }
      
      const received = parseFloat(receivedAmount);
      if (received > 0 && received > cashPaid) {
        changeAmount = received - cashPaid;
      }
    }

    setIsProcessing(true);
    try {
      // 1. Guardar la venta en almacenamiento local (offline_sales)
      addOfflineSale({
        sessionId: currentSession?.id || null,
        items: cart,
        subtotal: subtotalAfterDiscounts,
        tax,
        total,
        paymentMethod,
        changeAmount,
        cash_amount: cashAmount,
        paid_in_usd: paidInUsd,
        usd_amount: usdAmountPaid,
        exchange_rate_used: exchangeRateUsed,
      } as any);

      // 2. Descontar stock del inventario local (expoventas_products)
      const stockUpdates = cart.map(item => {
        const prod = products.find(p => p.id === item.id);
        const currentStock = prod ? Number(prod.stock) : Number(item.stock);
        const newStock = Math.max(0, currentStock - item.quantity);
        return {
          id: item.id,
          data: { stock: newStock }
        };
      });

      await bulkUpdate(stockUpdates);

      if (paymentMethod === "efectivo") {
        toast.success(`Venta procesada. Cambio: $${Math.round(changeAmount).toLocaleString('es-CL')}`);
      } else if (paymentMethod === "mixto") {
        const cardAmount = total - cashAmount;
        toast.success(`Venta procesada: $${cashAmount.toLocaleString('es-CL')} efectivo + $${cardAmount.toLocaleString('es-CL')} tarjeta`);
      } else {
        const methodNames: Record<string, string> = {
          debito: "Tarjeta de Débito",
          credito: "Tarjeta de Crédito",
          transferencia: "Transferencia"
        };
        toast.success(`Venta procesada con ${methodNames[paymentMethod] || paymentMethod}: $${total.toLocaleString('es-CL')}`);
      }

      // Limpiar carrito actual
      setCart([]);
      
      if (cartSessions.length > 1) {
        closeCartSession(activeSessionId);
      }
      
      setShowPaymentDialog(false);
      setReceivedAmount("");
      setPaymentMethod("efectivo");
      setPayInUsd(false);
      setUsdAmount("");
      setMixedCashAmount("");
      setMixedPayInUsd(false);
      setMixedUsdAmount("");
    } catch (error: any) {
      toast.error("Error al procesar la venta: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cart component para reutilizar en desktop y móvil
  const CartContent = () => (
    <>
      <div className="flex-1 overflow-auto space-y-2 md:space-y-3 mb-3 md:mb-4 max-h-[50vh] lg:max-h-[calc(100vh-28rem)]">
        {cart.length === 0 ? (
          <div className="h-full flex items-center justify-center py-8">
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
                <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                  <p className="font-medium text-sm md:text-base truncate">{item.name}</p>
                  {item.isCustomerPrice && (
                    <Badge variant="secondary" className="text-[10px] md:text-xs flex-shrink-0">
                      <User className="w-2 h-2 md:w-3 md:h-3 mr-0.5" />
                      <span className="hidden sm:inline">Precio cliente</span>
                      <span className="sm:hidden">PC</span>
                    </Badge>
                  )}
                  {item.promotion && (
                    <Badge variant="outline" className="text-[10px] md:text-xs flex-shrink-0">
                      <span className="hidden sm:inline">{getPromotionLabel(item)}</span>
                      <span className="sm:inline lg:hidden">P</span>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  {item.isCustomerPrice && item.originalPrice !== item.price && (
                    <p className="text-xs md:text-sm text-muted-foreground line-through">${item.originalPrice.toFixed(2)}</p>
                  )}
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

      <div className="space-y-2 md:space-y-3 border-t pt-3 md:pt-4 bg-card">
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
        
        {/* Selector de cliente */}
        <div className="space-y-2">
          <Label className="text-xs">Cliente (opcional para venta pendiente)</Label>
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger className="text-xs md:text-sm">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers.filter(c => c.type === "cliente").map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-gradient-success hover:opacity-90 text-sm md:text-base"
            size="lg"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            <CreditCard className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Cobrar
          </Button>
          {selectedCustomerId && (
            <Button
              className="w-full text-sm md:text-base"
              size="lg"
              variant="outline"
              onClick={handlePendingSale}
              disabled={cart.length === 0}
            >
              <User className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Registrar Venta Pendiente
            </Button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-h-[calc(100vh-10rem)] pb-24 lg:pb-0">
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
          <div className="flex items-center gap-2">
            {/* Ayuda de atajos */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Keyboard className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Atajos de Teclado</h4>
                  <ShortcutsHelp />
                </div>
              </PopoverContent>
            </Popover>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReturnDialog(true)}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Devolución</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWithdrawalDialog(true)}
            >
              <Wallet className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Retiro</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleOpenCloseCashDialog}
            >
              Cerrar Caja
            </Button>
          </div>
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
            ref={searchInputRef}
            placeholder="Buscar productos... (F5)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 md:pl-10 text-sm md:text-base"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {filteredProducts.map(product => {
            const cartQuantity = cart.find(item => item.id === product.id)?.quantity || 0;
            
            return (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 relative"
                onClick={() => cartQuantity === 0 ? addToCart(product) : undefined}
              >
                {/* Contador con botones +/- */}
                {cartQuantity > 0 && (
                  <div 
                    className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-1 sm:gap-2 bg-background border-2 border-primary rounded-full shadow-lg px-1 sm:px-2 py-0.5 sm:py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-destructive/10 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(product.id, -1);
                      }}
                    >
                      <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    
                    <span className="font-bold text-base sm:text-lg min-w-[28px] sm:min-w-[32px] text-center text-primary">
                      {cartQuantity}
                    </span>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-success/10 text-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                )}

                <CardContent className="p-3 md:p-6">
                {product.promotion && (
                    <Badge className="absolute top-1 right-1 md:top-2 md:right-2 bg-warning text-warning-foreground text-[10px] md:text-xs">
                      <Tag className="w-2 h-2 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                      {getPromotionLabel(product)}
                    </Badge>
                  )}
                  <div className="aspect-square bg-gradient-subtle rounded-lg mb-2 flex items-center justify-center h-12 md:h-16">
                    <Package className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h3 className="font-semibold text-xs md:text-sm leading-tight min-h-[2.5rem] md:min-h-[3rem] break-words cursor-default">{product.name}</h3>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p>{product.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-1">{product.category}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-base md:text-xl font-bold text-success">${product.price.toFixed(2)}</p>
                    <Badge 
                      variant={product.stock <= 0 ? "destructive" : product.stock <= 5 ? "secondary" : "outline"}
                      className="text-[10px] md:text-xs"
                    >
                      {product.stock} uds
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cart Section - Desktop only */}
      <div className="hidden lg:block lg:col-span-1">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-lg md:text-xl">Carrito de Compra</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col px-3 md:px-6 pb-3 md:pb-6">
            <CartContent />
          </CardContent>
        </Card>
      </div>
    </div>

      {/* Cart Drawer - Mobile/Tablet only */}
      {isMobileOrTablet && (
        <>
          <Drawer open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
            <DrawerTrigger asChild>
              <Button 
                size="lg"
                className="fixed top-4 right-4 h-16 w-16 rounded-full shadow-lg z-50 bg-gradient-success hover:opacity-90"
              >
                <div className="relative">
                  <ShoppingCart className="w-6 h-6" />
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-xs">
                      {cart.length}
                    </Badge>
                  )}
                </div>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle className="text-xl">Carrito de Compra</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 overflow-auto">
                <CartContent />
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="text-base sm:text-lg">Procesar Pago</DialogTitle>
            <DialogDescription className="text-sm">
              Total a cobrar: <span className="font-bold text-base sm:text-lg text-success">${total.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 pr-1">
            <div className="space-y-1.5 sm:space-y-4">
              <Label className="text-xs sm:text-sm">Método de Pago</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-2">
                <div className="flex items-center space-x-1.5 sm:space-x-2 p-1.5 sm:p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="efectivo" id="efectivo" />
                  <Label htmlFor="efectivo" className="flex items-center gap-1 sm:gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                    <DollarSign className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-success" />
                    <span>Efectivo</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 p-1.5 sm:p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="debito" id="debito" />
                  <Label htmlFor="debito" className="flex items-center gap-1 sm:gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                    <CreditCard className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                    <span>Débito</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 p-1.5 sm:p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="credito" id="credito" />
                  <Label htmlFor="credito" className="flex items-center gap-1 sm:gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                    <CreditCard className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                    <span>Crédito</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 p-1.5 sm:p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="transferencia" id="transferencia" />
                  <Label htmlFor="transferencia" className="flex items-center gap-1 sm:gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                    <Building2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                    <span>Transfer.</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 p-1.5 sm:p-3 rounded-lg border hover:bg-accent cursor-pointer col-span-2 sm:col-span-1">
                  <RadioGroupItem value="mixto" id="mixto" />
                  <Label htmlFor="mixto" className="flex items-center gap-1 sm:gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                    <div className="flex -space-x-1">
                      <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                      <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <span>Pago Mixto (Efectivo + Tarjeta)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === "efectivo" && (
              <div className="space-y-3 sm:space-y-4">
                {/* Quick Cash Buttons */}
                <div className="space-y-2">
                  <Label className="text-sm">Montos Rápidos</Label>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {quickCashAmounts().map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        className="h-10 sm:h-12 text-sm sm:text-lg font-semibold"
                        onClick={() => {
                          setReceivedAmount(amount.toString());
                          setPayInUsd(false);
                        }}
                      >
                        ${amount.toLocaleString('es-CL')}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-10 sm:h-12 gap-1.5 sm:gap-2 text-xs sm:text-sm"
                    onClick={() => {
                      setReceivedAmount(Math.ceil(total).toString());
                      setPayInUsd(false);
                    }}
                  >
                    <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="truncate">Monto Exacto (${Math.ceil(total).toLocaleString('es-CL')})</span>
                  </Button>
                </div>

                {/* USD Payment Option */}
                <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="pay-usd" className="flex items-center gap-1.5 sm:gap-2 cursor-pointer text-xs sm:text-sm">
                      <CircleDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
                      <span>Pagar en USD</span>
                    </Label>
                    <Switch
                      id="pay-usd"
                      checked={payInUsd}
                      onCheckedChange={(checked) => {
                        setPayInUsd(checked);
                        if (checked) {
                          setReceivedAmount("");
                          setUsdAmount("");
                        }
                      }}
                    />
                  </div>
                  
                  {payInUsd && (
                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          <span>Total: <span className="font-bold">${(total / currentRate).toFixed(2)} USD</span></span>
                          <span className="text-[10px] sm:text-xs">(1 USD = ${currentRate.toLocaleString('es-CL')} CLP)</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 sm:items-center">
                        <Label htmlFor="usd-amount" className="shrink-0 text-xs sm:text-sm">USD Recibido:</Label>
                        <Input
                          id="usd-amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={usdAmount}
                          className="h-9 sm:h-10 text-sm"
                          onChange={(e) => {
                            setUsdAmount(e.target.value);
                            const usd = parseFloat(e.target.value) || 0;
                            setReceivedAmount(Math.round(usd * currentRate).toString());
                          }}
                        />
                      </div>
                      {usdAmount && parseFloat(usdAmount) > 0 && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Equivale a: <span className="font-bold">${convertUsdToClp(parseFloat(usdAmount)).toLocaleString('es-CL')} CLP</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Regular CLP input */}
                {!payInUsd && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="received" className="text-sm">Monto Recibido (CLP)</Label>
                    <Input
                      id="received"
                      type="number"
                      step="1"
                      placeholder="0"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="h-10 sm:h-11 text-base"
                      autoFocus
                    />
                  </div>
                )}

                {/* Change Display */}
                {receivedAmount && parseFloat(receivedAmount) >= total && (
                  <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 border rounded-lg bg-success/10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-medium">Cambio a entregar:</span>
                      <span className="text-lg sm:text-xl font-bold text-success">
                        ${(parseFloat(receivedAmount) - total).toLocaleString('es-CL')}
                      </span>
                    </div>
                    
                    {/* Change Breakdown */}
                    {parseFloat(receivedAmount) - total > 0 && (
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-[10px] sm:text-xs text-muted-foreground">Desglose del cambio:</Label>
                        <div className="grid grid-cols-2 gap-1">
                          {calculateChangeBreakdown(parseFloat(receivedAmount) - total).map((item: DenominationBreakdown) => (
                            <div
                              key={item.denomination}
                              className="flex items-center justify-between text-[10px] sm:text-xs p-1 sm:p-1.5 bg-background rounded"
                            >
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                {item.type === 'billete' ? (
                                  <Banknote className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-success shrink-0" />
                                ) : (
                                  <CircleDollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground shrink-0" />
                                )}
                                <span>${item.denomination.toLocaleString('es-CL')}</span>
                              </span>
                              <span className="font-semibold">×{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mixed Payment UI */}
            {paymentMethod === "mixto" && (
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 border rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total a pagar:</span>
                    <span className="text-lg font-bold">${total.toLocaleString('es-CL')}</span>
                  </div>
                </div>

                {/* Cash Amount Input */}
                <div className="space-y-2">
                  <Label className="text-sm">Monto en Efectivo</Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="Ingresa el monto en efectivo"
                    value={mixedCashAmount}
                    onChange={(e) => setMixedCashAmount(e.target.value)}
                    className="h-10 sm:h-11 text-base"
                    autoFocus
                  />
                </div>

                {/* Quick Cash Buttons for Mixed */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Montos Rápidos</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {quickCashAmounts().filter(amount => amount <= total).map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold px-1"
                        onClick={() => {
                          setMixedCashAmount(amount.toString());
                          setMixedPayInUsd(false);
                        }}
                      >
                        ${(amount / 1000).toFixed(0)}k
                      </Button>
                    ))}
                  </div>
                  {/* Exact Amount Button for Mixed */}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => setMixedCashAmount(Math.ceil(total * 0.5).toString())}
                  >
                    <Banknote className="w-3 h-3 mr-1" />
                    50% Efectivo (${Math.ceil(total * 0.5).toLocaleString('es-CL')})
                  </Button>
                </div>

                {/* USD Option for Mixed Payment */}
                <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="mixed-pay-usd" className="flex items-center gap-1.5 sm:gap-2 cursor-pointer text-xs sm:text-sm">
                      <CircleDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
                      <span>Efectivo en USD</span>
                    </Label>
                    <Switch
                      id="mixed-pay-usd"
                      checked={mixedPayInUsd}
                      onCheckedChange={(checked) => {
                        setMixedPayInUsd(checked);
                        if (checked) {
                          setMixedCashAmount("");
                          setMixedUsdAmount("");
                        }
                      }}
                    />
                  </div>
                  
                  {mixedPayInUsd && (
                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <span className="text-[10px] sm:text-xs">(1 USD = ${currentRate.toLocaleString('es-CL')} CLP)</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 sm:items-center">
                        <Label htmlFor="mixed-usd-amount" className="shrink-0 text-xs sm:text-sm">USD Recibido:</Label>
                        <Input
                          id="mixed-usd-amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={mixedUsdAmount}
                          className="h-9 sm:h-10 text-sm"
                          onChange={(e) => {
                            setMixedUsdAmount(e.target.value);
                            const usd = parseFloat(e.target.value) || 0;
                            setMixedCashAmount(Math.round(usd * currentRate).toString());
                          }}
                        />
                      </div>
                      {mixedUsdAmount && parseFloat(mixedUsdAmount) > 0 && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Equivale a: <span className="font-bold">${convertUsdToClp(parseFloat(mixedUsdAmount)).toLocaleString('es-CL')} CLP</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary of Mixed Payment */}
                {mixedCashAmount && parseFloat(mixedCashAmount) > 0 && parseFloat(mixedCashAmount) < total && (
                  <div className="space-y-2 p-3 border rounded-lg bg-accent">
                    <h4 className="text-sm font-semibold">Resumen del Pago Mixto</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-success" />
                          Efectivo:
                        </span>
                        <span className="font-bold text-success">
                          ${parseFloat(mixedCashAmount).toLocaleString('es-CL')}
                          {mixedPayInUsd && mixedUsdAmount && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (${parseFloat(mixedUsdAmount).toFixed(2)} USD)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-primary" />
                          Tarjeta:
                        </span>
                        <span className="font-bold text-primary">
                          ${(total - parseFloat(mixedCashAmount)).toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-2 border-t">
                        <span className="font-semibold">Total:</span>
                        <span className="font-bold">${total.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional: Cash Received for Change */}
                {mixedCashAmount && parseFloat(mixedCashAmount) > 0 && parseFloat(mixedCashAmount) < total && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Monto Recibido en Efectivo (si hay vuelto)</Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder={`Mínimo $${parseFloat(mixedCashAmount).toLocaleString('es-CL')}`}
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="h-9 sm:h-10 text-sm"
                    />
                    {receivedAmount && parseFloat(receivedAmount) > parseFloat(mixedCashAmount) && (
                      <div className="p-2 border rounded bg-success/10">
                        <div className="flex items-center justify-between text-sm">
                          <span>Cambio:</span>
                          <span className="font-bold text-success">
                            ${(parseFloat(receivedAmount) - parseFloat(mixedCashAmount)).toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Validation Message */}
                {mixedCashAmount && parseFloat(mixedCashAmount) >= total && (
                  <div className="p-2 border rounded-lg bg-destructive/10 text-destructive text-sm">
                    El monto en efectivo debe ser menor al total. Para pago completo en efectivo, selecciona "Efectivo".
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
              <Button variant="outline" onClick={() => {
                setShowPaymentDialog(false);
                setPayInUsd(false);
                setUsdAmount("");
              }} className="flex-1 h-10 sm:h-11 text-sm">
                Cancelar
              </Button>
              <Button 
                onClick={processPayment} 
                className="flex-1 bg-gradient-success h-10 sm:h-11 text-sm"
                disabled={isProcessing}
              >
                {isProcessing ? "Procesando..." : "Confirmar Pago"}
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
        paymentMethodTotals={paymentMethodTotals}
      />
      
      {/* Diálogo de devoluciones */}
      <ReturnDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
      />
      
      {/* Diálogo de retiro de caja */}
      <CashWithdrawalDialog
        open={showWithdrawalDialog}
        onOpenChange={setShowWithdrawalDialog}
        sessionId={currentSession?.id || ""}
      />

      {/* Diálogo de elección de promoción */}
      <Dialog open={!!promoDialogProduct} onOpenChange={(o) => { if (!o) { setPromoDialogProduct(null); setPromoPackCount(1); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{promoDialogProduct?.name}</DialogTitle>
            <DialogDescription>
              Este producto tiene una promoción disponible. ¿Cómo deseas agregarlo?
            </DialogDescription>
          </DialogHeader>
          {promoDialogProduct?.promotion?.type === "bulk" && promoDialogProduct.promotion.quantity && promoDialogProduct.promotion.discountedPrice && (
            <div className="flex flex-col gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">¿Cuántas promociones lleva el cliente?</Label>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 rounded-full"
                    onClick={() => setPromoPackCount(Math.max(1, promoPackCount - 1))}
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={promoPackCount}
                    onChange={(e) => setPromoPackCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 text-center text-xl font-bold h-11"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 rounded-full"
                    onClick={() => setPromoPackCount(promoPackCount + 1)}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Total: {promoPackCount * promoDialogProduct.promotion.quantity} unidades · ${(promoPackCount * promoDialogProduct.promotion.discountedPrice).toLocaleString()}
                </p>
              </div>
              <Button
                size="lg"
                className="h-auto py-4 bg-gradient-primary"
                onClick={() => {
                  const p = promoDialogProduct;
                  const packs = promoPackCount;
                  setPromoDialogProduct(null);
                  setPromoPackCount(1);
                  addToCartDirect(p, p.promotion!.quantity! * packs);
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold text-base">
                    Agregar {promoPackCount} {promoPackCount === 1 ? "promoción" : "promociones"} ({promoDialogProduct.promotion.quantity} x ${promoDialogProduct.promotion.discountedPrice.toLocaleString()})
                  </span>
                  <span className="text-xs opacity-90">Aplica descuento automáticamente</span>
                </div>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-auto py-4"
                onClick={() => {
                  const p = promoDialogProduct;
                  setPromoDialogProduct(null);
                  setPromoPackCount(1);
                  addToCartDirect(p, 1);
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold text-base">Agregar 1 unidad</span>
                  <span className="text-xs opacity-70">Precio normal: ${promoDialogProduct.price.toLocaleString()}</span>
                </div>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
