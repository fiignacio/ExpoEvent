import { AlertTriangle, Package, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  sku: string;
}

interface LowStockAlertProps {
  products: LowStockProduct[];
  threshold: number;
  dismissible?: boolean;
}

export function LowStockAlert({ products, threshold, dismissible = true }: LowStockAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed || products.length === 0) return null;

  const criticalProducts = products.filter(p => p.stock <= 0);
  const lowProducts = products.filter(p => p.stock > 0 && p.stock <= threshold);

  return (
    <Alert variant={criticalProducts.length > 0 ? "destructive" : "default"} className="relative">
      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Stock Bajo
        <Badge variant={criticalProducts.length > 0 ? "destructive" : "secondary"}>
          {products.length} producto{products.length !== 1 ? 's' : ''}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          {criticalProducts.length > 0 && (
            <div>
              <p className="text-sm font-medium text-destructive mb-1">
                ⚠️ Sin stock ({criticalProducts.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {criticalProducts.slice(0, 5).map(p => (
                  <Badge key={p.id} variant="destructive" className="text-xs">
                    {p.name}
                  </Badge>
                ))}
                {criticalProducts.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{criticalProducts.length - 5} más
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {lowProducts.length > 0 && (
            <div>
              <p className="text-sm font-medium text-warning mb-1">
                ⚡ Stock bajo ({lowProducts.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {lowProducts.slice(0, 5).map(p => (
                  <Badge key={p.id} variant="secondary" className="text-xs">
                    {p.name} ({p.stock})
                  </Badge>
                ))}
                {lowProducts.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{lowProducts.length - 5} más
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => navigate('/inventory')}
          >
            <Package className="w-4 h-4 mr-2" />
            Ver Inventario
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
