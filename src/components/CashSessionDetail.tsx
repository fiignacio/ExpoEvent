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
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCashSessions } from "@/hooks/useCashSessions";
import { DollarSign, CreditCard, Banknote, TrendingUp, TrendingDown, Package } from "lucide-react";

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

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

  const paymentMethodStats = sales.reduce((acc, sale) => {
    acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total;
    return acc;
  }, {} as Record<string, number>);

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const difference = sessionData?.final_amount ? sessionData.final_amount - sessionData.initial_amount : 0;
  const expectedAmount = sessionData?.initial_amount + totalSales;
  const cashDifference = sessionData?.final_amount ? sessionData.final_amount - expectedAmount : 0;

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'efectivo':
        return <Banknote className="w-4 h-4" />;
      case 'tarjeta':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalle de Sesión de Caja</DialogTitle>
          <DialogDescription>
            {sessionData?.profiles?.full_name} - {sessionData?.opened_at && format(new Date(sessionData.opened_at), "PPP 'a las' HH:mm", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
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
                    <Card key={sale.id}>
                      <CardContent className="p-4">
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
                          <div className="text-right">
                            <div className="text-xl font-bold text-success">
                              ${sale.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {sale.items.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Package className="w-3 h-3 text-muted-foreground" />
                                <span>{item.name}</span>
                                <span className="text-muted-foreground">x{item.quantity}</span>
                              </div>
                              <span className="font-medium">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
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
