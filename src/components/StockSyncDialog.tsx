import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, Package, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Product } from "@/types/product";
import {
  computeInventoryReconciliation,
  applyStockReconciliation,
  ProductReconciliationItem,
} from "@/utils/stockReconciler";

interface StockSyncDialogProps {
  products: Product[];
  onSyncComplete: () => Promise<void> | void;
}

export function StockSyncDialog({ products, onSyncComplete }: StockSyncDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reconciledItems, setReconciledItems] = useState<ProductReconciliationItem[]>([]);
  const [initialStockOverrides, setInitialStockOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      loadAnalysis();
    }
  }, [open, products]);

  const loadAnalysis = async (overrides: Record<string, number> = initialStockOverrides) => {
    setLoading(true);
    try {
      const results = await computeInventoryReconciliation(products, overrides);
      setReconciledItems(results);
    } finally {
      setLoading(false);
    }
  };

  const handleBaseStockChange = (productId: string, value: string) => {
    const num = parseInt(value, 10);
    const newOverrides = {
      ...initialStockOverrides,
      [productId]: isNaN(num) ? 0 : Math.max(0, num),
    };
    setInitialStockOverrides(newOverrides);
    loadAnalysis(newOverrides);
  };

  const handleApplySync = async () => {
    setSaving(true);
    try {
      const ok = await applyStockReconciliation(reconciledItems);
      if (ok) {
        await onSyncComplete();
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const desyncedCount = reconciledItems.filter((i) => i.isDesynced).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3 gap-1.5 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
          title="Sincronizar el stock de productos con todas las ventas realizadas"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline font-medium">Sincronizar con Ventas</span>
          <span className="sm:hidden font-medium">Sinc. Stock</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Sincronizar Stock con Ventas Realizadas</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Recalcula el stock disponible de cada producto restando todas las ventas registradas en Reportería.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen del Estado */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            {desyncedCount > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {desyncedCount} producto(s) desfasados
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 gap-1 text-white">
                <CheckCircle2 className="w-3 h-3" />
                Todos los productos están cuadrados
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {reconciledItems.length} productos analizados contra el historial de ventas
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadAnalysis()}
            disabled={loading}
            className="h-7 text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        </div>

        {/* Tabla de Reconciliación */}
        <div className="flex-1 overflow-auto border rounded-lg min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span>Analizando ventas y calculando stock...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px] sm:text-xs">
                  <TableHead>Producto / SKU</TableHead>
                  <TableHead className="w-[120px] text-center">Stock Inicial Base</TableHead>
                  <TableHead className="w-[95px] text-center">Ventas Reales</TableHead>
                  <TableHead className="w-[95px] text-center">Stock Actual</TableHead>
                  <TableHead className="w-[110px] text-center">Stock Corregido</TableHead>
                  <TableHead className="w-[90px] text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciledItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`text-xs ${item.isDesynced ? "bg-amber-500/5 dark:bg-amber-500/10" : ""}`}
                  >
                    <TableCell>
                      <div className="font-semibold text-xs">{item.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{item.sku}</div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={item.initialStock}
                          onChange={(e) => handleBaseStockChange(item.id, e.target.value)}
                          className="w-16 h-7 text-center text-xs p-1 font-semibold"
                          title="Stock con el que empezó el evento. Puedes ajustarlo si tenías más unidades (ej. 300 para PIN)"
                        />
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-bold text-primary">
                      {item.totalSold} unid.
                    </TableCell>

                    <TableCell className="text-center text-muted-foreground">
                      {item.currentStock}
                    </TableCell>

                    <TableCell className="text-center font-bold text-foreground">
                      <span className={item.isDesynced ? "text-blue-600 dark:text-blue-400 font-extrabold" : ""}>
                        {item.suggestedStock}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      {item.isDesynced ? (
                        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400">
                          {item.difference > 0 ? `-${item.difference}` : `+${Math.abs(item.difference)}`}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center pt-2">
          <p className="text-[11px] text-muted-foreground text-left">
            💡 El stock corregido se calcula restando las ventas reales al stock inicial base.
          </p>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplySync}
              disabled={saving || loading || desyncedCount === 0}
              className="bg-primary gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Sincronizando..." : `Aplicar Stock Corregido (${desyncedCount})`}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
