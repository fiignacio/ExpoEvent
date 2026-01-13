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
import { Banknote, ArrowDownFromLine } from "lucide-react";
import { useCashWithdrawals } from "@/hooks/useCashWithdrawals";

interface CashWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onComplete?: () => void;
}

export function CashWithdrawalDialog({ 
  open, 
  onOpenChange, 
  sessionId, 
  onComplete 
}: CashWithdrawalDialogProps) {
  const { recordWithdrawal, loading } = useCashWithdrawals();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    if (!reason.trim()) {
      return;
    }

    const success = await recordWithdrawal(sessionId, numAmount, reason.trim());
    if (success) {
      setAmount("");
      setReason("");
      onComplete?.();
      onOpenChange(false);
    }
  };

  const quickAmounts = [5000, 10000, 20000, 50000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownFromLine className="w-5 h-5" />
            Retiro de Caja
          </DialogTitle>
          <DialogDescription>
            Registra un retiro parcial de efectivo de la caja
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto a Retirar</Label>
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickAmounts.map(amt => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                onClick={() => setAmount(amt.toString())}
              >
                ${amt.toLocaleString('es-CL')}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del Retiro *</Label>
            <Textarea
              id="reason"
              placeholder="ej: Pago a proveedor, cambio para otra caja..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !amount || !reason.trim()}
            >
              <ArrowDownFromLine className="w-4 h-4 mr-2" />
              Registrar Retiro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
