import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen de tu negocio en tiempo real</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas Hoy"
          value="$12,450"
          icon={DollarSign}
          trend={{ value: "12.5%", isPositive: true }}
          variant="success"
        />
        <StatCard
          title="Transacciones"
          value="48"
          icon={ShoppingCart}
          trend={{ value: "8.2%", isPositive: true }}
          variant="default"
        />
        <StatCard
          title="Ticket Promedio"
          value="$259"
          icon={TrendingUp}
          trend={{ value: "3.1%", isPositive: false }}
          variant="default"
        />
        <StatCard
          title="Productos en Stock"
          value="1,245"
          icon={Package}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: "#1234", time: "Hace 5 min", amount: "$450", items: "3 productos" },
                { id: "#1233", time: "Hace 12 min", amount: "$120", items: "1 producto" },
                { id: "#1232", time: "Hace 28 min", amount: "$890", items: "5 productos" },
                { id: "#1231", time: "Hace 45 min", amount: "$320", items: "2 productos" },
              ].map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{sale.id}</p>
                    <p className="text-sm text-muted-foreground">{sale.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">{sale.amount}</p>
                    <p className="text-sm text-muted-foreground">{sale.items}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Café Americano", sold: 24, revenue: "$120" },
                { name: "Croissant", sold: 18, revenue: "$90" },
                { name: "Capuccino", sold: 16, revenue: "$96" },
                { name: "Pan Integral", sold: 12, revenue: "$48" },
              ].map((product, index) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sold} vendidos</p>
                  </div>
                  <p className="font-semibold text-success">{product.revenue}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
