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
import { DollarSign, AlertTriangle } from "lucide-react";

interface CloseCashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (finalAmount: number) => void;
  initialAmount: number;
}

export function CloseCashDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  initialAmount 
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Cierre de Caja
            </DialogTitle>
            <DialogDescription>
              Ingresa el monto final que hay en la caja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-accent p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto Inicial:</span>
                <span className="font-semibold">${initialAmount.toFixed(2)}</span>
              </div>
              {finalAmount && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monto Final:</span>
                    <span className="font-semibold">${parseFloat(finalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Diferencia:</span>
                    <span className={`font-bold ${difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${Math.abs(difference).toFixed(2)} {difference >= 0 ? '(+)' : '(-)'}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="final-amount">Monto Final</Label>
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