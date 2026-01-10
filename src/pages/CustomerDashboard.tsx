import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, Package } from "lucide-react";
import { useCustomerDashboard } from "@/hooks/useCustomerDashboard";
import { RefreshButton } from "@/components/RefreshButton";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CustomerDashboard() {
  const {
    receivables,
    payables,
    trends,
    salesByCustomer,
    loading,
    getTotalReceivables,
    getTotalPayables,
    refresh,
  } = useCustomerDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 bg-muted rounded w-32"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalReceivables = getTotalReceivables();
  const totalPayables = getTotalPayables();
  const netBalance = totalReceivables - totalPayables;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Dashboard de Clientes y Proveedores</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Análisis de deudas y ventas</p>
        </div>
        <RefreshButton onRefresh={refresh} showText />
      </div>

      {/* Summary Cards - Responsive */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Por Cobrar</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold text-success mt-1 truncate">
                  ${totalReceivables.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{receivables.length} clientes</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-success flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Por Pagar</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold text-destructive mt-1 truncate">
                  ${totalPayables.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{payables.length} proveedores</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-danger flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Balance Neto</p>
                <p className={`text-base sm:text-lg md:text-2xl font-bold mt-1 truncate ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${Math.abs(netBalance).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {netBalance >= 0 ? 'A favor' : 'En contra'}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Clientes</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold mt-1">{receivables.length + payables.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Con deudas</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-accent flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="receivables">Por Cobrar</TabsTrigger>
          <TabsTrigger value="payables">Por Pagar</TabsTrigger>
          <TabsTrigger value="sales">Ventas por Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tendencias Históricas (Últimos 14 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="receivables" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      name="Por Cobrar"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="payables" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      name="Por Pagar"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No hay datos de tendencias disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Deudas por Cobrar - Top Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receivables.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={receivables.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="customerName" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalDebt" fill="hsl(var(--success))" name="Deuda" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-6 space-y-3">
                    {receivables.map((item, index) => (
                      <div key={item.customerId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-sm font-semibold text-success">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.pendingTransactions} transacciones pendientes
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-success">
                          ${item.totalDebt.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-2" />
                  <p>No hay deudas por cobrar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Deudas por Pagar - Top Proveedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payables.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={payables.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="customerName" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalDebt" fill="hsl(var(--destructive))" name="Deuda" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-6 space-y-3">
                    {payables.map((item, index) => (
                      <div key={item.customerId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-sm font-semibold text-destructive">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.pendingTransactions} transacciones pendientes
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-destructive">
                          ${item.totalDebt.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-2" />
                  <p>No hay deudas por pagar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Ventas por Cliente/Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesByCustomer.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={salesByCustomer.slice(0, 6)}
                          dataKey="totalSales"
                          nameKey="customerName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {salesByCustomer.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>

                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesByCustomer.slice(0, 6)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="customerName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalSales" fill="hsl(var(--primary))" name="Ventas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-6 space-y-3">
                    {salesByCustomer.map((item, index) => (
                      <div key={item.customerId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.transactionCount} transacciones
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-primary">
                          ${item.totalSales.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Package className="w-12 h-12 mb-2" />
                  <p>No hay ventas registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
