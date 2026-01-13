import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, RotateCcw, Package, Minus, Plus } from "lucide-react";
import { useReturns, SaleForReturn, ReturnItem, RefundMethod } from "@/hooks/useReturns";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function ReturnDialog({ open, onOpenChange, onComplete }: ReturnDialogProps) {
  const { searchSale, processReturn, loading } = useReturns();
  const [step, setStep] = useState<"search" | "select" | "confirm">("search");
  const [saleId, setSaleId] = useState("");
  const [sale, setSale] = useState<SaleForReturn | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("original_method");

  const resetState = () => {
    setStep("search");
    setSaleId("");
    setSale(null);
    setReturnItems([]);
    setReason("");
    setRefundMethod("original_method");
  };

  const handleSearch = async () => {
    if (!saleId.trim()) {
      toast.error("Ingresa el ID de la venta");
      return;
    }

    const foundSale = await searchSale(saleId.trim());
    if (foundSale) {
      setSale(foundSale);
      setReturnItems(
        (foundSale.items as any[]).map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          returnQuantity: 0
        }))
      );
      setStep("select");
    }
  };

  const updateReturnQuantity = (itemId: string, delta: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0, Math.min(item.quantity, item.returnQuantity + delta));
        return { ...item, returnQuantity: newQty };
      }
      return item;
    }));
  };

  const selectAll = () => {
    setReturnItems(prev => prev.map(item => ({
      ...item,
      returnQuantity: item.quantity
    })));
  };

  const clearSelection = () => {
    setReturnItems(prev => prev.map(item => ({
      ...item,
      returnQuantity: 0
    })));
  };

  const totalToRefund = returnItems.reduce(
    (sum, item) => sum + (item.price * item.returnQuantity), 0
  );

  const hasSelection = returnItems.some(item => item.returnQuantity > 0);

  const handleConfirm = async () => {
    if (!sale || !hasSelection) return;
    
    if (!reason.trim()) {
      toast.error("Ingresa el motivo de la devolución");
      return;
    }

    const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);
    const success = await processReturn(sale, itemsToReturn, reason, refundMethod);
    
    if (success) {
      onComplete?.();
      onOpenChange(false);
      resetState();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetState();
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Devolución de Productos
          </DialogTitle>
          <DialogDescription>
            {step === "search" && "Busca la venta por su ID"}
            {step === "select" && "Selecciona los productos a devolver"}
            {step === "confirm" && "Confirma los detalles de la devolución"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {step === "search" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sale-id">ID de Venta</Label>
                <div className="flex gap-2">
                  <Input
                    id="sale-id"
                    placeholder="ej: abc12345-..."
                    value={saleId}
                    onChange={(e) => setSaleId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                El ID de venta se encuentra en el ticket o en el historial de ventas.
              </p>
            </div>
          )}

          {step === "select" && sale && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span>{format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Método:</span>
                    <Badge variant="outline">{sale.payment_method}</Badge>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Original:</span>
                    <span>${sale.total.toLocaleString('es-CL')}</span>
                  </div>
                  {sale.status === 'partial_return' && (
                    <Badge variant="secondary" className="mt-2">Devolución parcial previa</Badge>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Seleccionar todo
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Limpiar
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {returnItems.map(item => (
                  <Card key={item.id} className={item.returnQuantity > 0 ? "border-primary" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${item.price.toLocaleString('es-CL')} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateReturnQuantity(item.id, -1)}
                            disabled={item.returnQuantity === 0}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">
                            {item.returnQuantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateReturnQuantity(item.id, 1)}
                            disabled={item.returnQuantity >= item.quantity}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {hasSelection && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex justify-between font-medium">
                      <span>Total a Reembolsar:</span>
                      <span className="text-primary">${totalToRefund.toLocaleString('es-CL')}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("search")} className="flex-1">
                  Atrás
                </Button>
                <Button 
                  onClick={() => setStep("confirm")} 
                  disabled={!hasSelection}
                  className="flex-1"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo de Devolución *</Label>
                <Textarea
                  id="reason"
                  placeholder="Describe el motivo..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Método de Reembolso</Label>
                <RadioGroup value={refundMethod} onValueChange={(v) => setRefundMethod(v as RefundMethod)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="original_method" id="original" />
                    <Label htmlFor="original" className="font-normal cursor-pointer">
                      Método original ({sale?.payment_method})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="font-normal cursor-pointer">
                      Efectivo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="credit_note" id="credit" />
                    <Label htmlFor="credit" className="font-normal cursor-pointer">
                      Nota de crédito
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm font-medium">Resumen:</p>
                  <p className="text-xs text-muted-foreground">
                    {returnItems.filter(i => i.returnQuantity > 0).length} producto(s) a devolver
                  </p>
                  <p className="text-lg font-bold text-destructive">
                    Reembolso: ${totalToRefund.toLocaleString('es-CL')}
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
                  Atrás
                </Button>
                <Button 
                  onClick={handleConfirm}
                  disabled={loading || !reason.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Procesar Devolución
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
