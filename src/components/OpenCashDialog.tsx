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
import { DollarSign } from "lucide-react";

interface OpenCashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (initialAmount: number) => void;
}

export function OpenCashDialog({ open, onOpenChange, onConfirm }: OpenCashDialogProps) {
  const [initialAmount, setInitialAmount] = useState("");

  const handleConfirm = () => {
    const amount = parseFloat(initialAmount) || 0;
    onConfirm(amount);
    setInitialAmount("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Apertura de Caja
          </DialogTitle>
          <DialogDescription>
            Ingresa el monto inicial con el que comienza la caja
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initial-amount">Monto Inicial</Label>
            <Input
              id="initial-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm();
                }
              }}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Abrir Caja
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}