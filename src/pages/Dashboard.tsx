import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { ShoppingCart, Package, Settings, BarChart3, Users, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LowStockAlert } from "@/components/LowStockAlert";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { profile, role } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { stats, loading } = useDashboardStats(settings?.low_stock_threshold || 10);

  const menuItems = [
    { title: "Punto de Venta", description: "Realizar ventas", icon: ShoppingCart, href: "/pos", color: "bg-gradient-primary" },
    { title: "Inventario", description: "Gestionar productos", icon: Package, href: "/inventory", color: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
    { title: "Reportes", description: "Ver estadísticas", icon: BarChart3, href: "/reports", color: "bg-gradient-to-br from-amber-500 to-orange-600" },
    { title: "Clientes", description: "Gestionar clientes", icon: Users, href: "/customers", color: "bg-gradient-to-br from-violet-500 to-purple-600" },
    { title: "Configuración", description: "Ajustes del sistema", icon: Settings, href: "/settings", color: "bg-gradient-to-br from-slate-500 to-slate-600" },
  ];

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-CL')}`;

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-6 px-2 sm:px-4 md:px-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Bienvenido, {profile?.full_name || "Usuario"}
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base">
          Sistema de Punto de Venta
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ventas Hoy</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.salesToday)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stats.growthPercentage >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-success" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-destructive" />
                      )}
                      <span className={`text-xs ${stats.growthPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {stats.growthPercentage >= 0 ? '+' : ''}{stats.growthPercentage.toFixed(1)}% vs ayer
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-success flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Transacciones</p>
                    <p className="text-xl font-bold">{stats.transactionsToday}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ticket prom: {formatCurrency(stats.averageTicketToday)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Semana</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.salesWeek)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Últimos 7 días</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.pendingTransactionsAmount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.pendingTransactions} deudas</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Low Stock Alert */}
      {!loading && stats.lowStockProducts.length > 0 && (
        <LowStockAlert 
          products={stats.lowStockProducts} 
          threshold={settings?.low_stock_threshold || 10} 
        />
      )}

      {/* Active Session & Top Products */}
      <div className="grid gap-4 md:grid-cols-2">
        {stats.activeCashSession && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Caja Activa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{stats.activeCashSession.userName || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground">
                Apertura: {formatCurrency(stats.activeCashSession.initialAmount)}
              </p>
            </CardContent>
          </Card>
        )}

        {stats.topProductsToday.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Productos Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats.topProductsToday.slice(0, 3).map((p, i) => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="truncate flex-1">{i + 1}. {p.name}</span>
                    <Badge variant="secondary" className="ml-2">{p.quantity}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {menuItems.map((item) => (
          <Card key={item.href} className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]" onClick={() => navigate(item.href)}>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl ${item.color} flex items-center justify-center shadow-md`}>
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base md:text-lg leading-tight">{item.title}</h3>
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">{item.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role indicator */}
      <Card className="mt-4">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Rol actual: <span className="font-semibold capitalize">{role || 'Usuario'}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
