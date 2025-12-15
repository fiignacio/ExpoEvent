import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, AlertTriangle, CreditCard, Banknote, Smartphone } from "lucide-react";

interface PaymentMethodTotal {
  efectivo: number;
  debito: number;
  credito: number;
  transferencia: number;
}

interface CloseCashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (finalAmount: number) => void;
  initialAmount: number;
  paymentMethodTotals: PaymentMethodTotal;
}

export function CloseCashDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  initialAmount,
  paymentMethodTotals
}: CloseCashDialogProps) {
  const [finalAmount, setFinalAmount] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleNext = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    const amount = parseFloat(finalAmount) || 0;
    onConfirm(amount);
    setFinalAmount("");
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const difference = parseFloat(finalAmount || "0") - initialAmount;
  const totalSales = Object.values(paymentMethodTotals).reduce((sum, val) => sum + val, 0);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <Banknote className="w-4 h-4" />;
      case 'debito':
      case 'credito':
        return <CreditCard className="w-4 h-4" />;
      case 'transferencia':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const paymentMethodLabels = {
    efectivo: "Efectivo",
    debito: "Débito",
    credito: "Crédito",
    transferencia: "Transferencia"
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Cierre de Caja
            </DialogTitle>
            <DialogDescription>
              Revisa los ingresos por método de pago e ingresa el monto final
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Resumen de Ingresos por Método de Pago */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Ingresos por Método de Pago</h4>
              <div className="grid gap-2">
                {(Object.entries(paymentMethodTotals) as [keyof PaymentMethodTotal, number][]).map(([method, amount]) => (
                  <Card key={method}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(method)}
                          <span className="font-medium text-sm">
                            {paymentMethodLabels[method]}
                          </span>
                        </div>
                        <span className="font-bold text-success">
                          ${amount.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total Ventas</span>
                      <span className="font-bold text-lg text-success">
                        ${totalSales.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="bg-accent p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto Inicial:</span>
                <span className="font-semibold">${initialAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ventas del Día:</span>
                <span className="font-semibold text-success">+${totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1 mt-1">
                <span className="text-muted-foreground font-medium">Monto Esperado:</span>
                <span className="font-bold">${(initialAmount + totalSales).toFixed(2)}</span>
              </div>
              {finalAmount && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monto Contado:</span>
                    <span className="font-semibold">${parseFloat(finalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Diferencia de Caja:</span>
                    <span className={`font-bold ${(parseFloat(finalAmount) - (initialAmount + totalSales)) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${Math.abs(parseFloat(finalAmount) - (initialAmount + totalSales)).toFixed(2)} {(parseFloat(finalAmount) - (initialAmount + totalSales)) >= 0 ? '(Sobrante)' : '(Faltante)'}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="final-amount">Monto Final en Caja</Label>
              <Input
                id="final-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && finalAmount) {
                    handleNext();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!finalAmount}
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Confirmar Cierre de Caja
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Al cerrar la caja, tu sesión se cerrará automáticamente.</p>
              <p className="font-semibold">¿Estás seguro que deseas continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmation(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Cerrar Caja y Desconectarme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}