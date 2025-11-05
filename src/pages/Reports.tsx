import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Package, Users, Calendar, Eye } from "lucide-react";
import { useCashSessions } from "@/hooks/useCashSessions";
import { CashSessionDetail } from "@/components/CashSessionDetail";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const salesData = [
  { name: "Lun", ventas: 4500, transacciones: 45 },
  { name: "Mar", ventas: 5200, transacciones: 52 },
  { name: "Mié", ventas: 4800, transacciones: 48 },
  { name: "Jue", ventas: 6100, transacciones: 61 },
  { name: "Vie", ventas: 7500, transacciones: 75 },
  { name: "Sáb", ventas: 8200, transacciones: 82 },
  { name: "Dom", ventas: 6800, transacciones: 68 },
];

const categoryData = [
  { name: "Bebidas", value: 45, color: "#2563eb" },
  { name: "Comida", value: 30, color: "#10b981" },
  { name: "Panadería", value: 25, color: "#f59e0b" },
];

const topProducts = [
  { name: "Café Americano", ventas: 250, ingresos: 1250 },
  { name: "Capuccino", ventas: 180, ingresos: 1080 },
  { name: "Sándwich", ventas: 120, ingresos: 1020 },
  { name: "Croissant", ventas: 150, ingresos: 675 },
  { name: "Ensalada", ventas: 90, ingresos: 630 },
];

export default function Reports() {
  const { sessions, loading } = useCashSessions();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewSession = (session: any) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes y Analytics</h1>
        <p className="text-muted-foreground mt-1">Análisis detallado de tu negocio</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Totales</p>
                <p className="text-2xl font-bold text-success mt-1">$43,100</p>
                <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-success flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-2xl font-bold mt-1">431</p>
                <p className="text-xs text-success mt-1">+12% vs semana anterior</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                <p className="text-2xl font-bold mt-1">$100.00</p>
                <p className="text-xs text-muted-foreground mt-1">Por transacción</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-warning flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Productos Vendidos</p>
                <p className="text-2xl font-bold mt-1">790</p>
                <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-subtle flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones de Caja</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Día</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ventas" fill="#10b981" name="Ventas ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transacciones por Día</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="transacciones" stroke="#2563eb" strokeWidth={2} name="Transacciones" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ventas" fill="#2563eb" name="Unidades Vendidas" />
                  <Bar dataKey="ingresos" fill="#10b981" name="Ingresos ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Sesiones de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando sesiones...
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay sesiones de caja registradas
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const difference = session.final_amount 
                      ? session.final_amount - session.initial_amount 
                      : 0;
                    
                    return (
                      <Card key={session.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge 
                                  variant={session.status === 'open' ? 'default' : 'secondary'}
                                  className="capitalize"
                                >
                                  {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                                </Badge>
                                <span className="font-medium">
                                  {session.profiles?.full_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(session.opened_at), "PPP", { locale: es })}
                                </div>
                                <span>
                                  {format(new Date(session.opened_at), "HH:mm", { locale: es })}
                                  {session.closed_at && ` - ${format(new Date(session.closed_at), "HH:mm", { locale: es })}`}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Inicial</div>
                                <div className="font-semibold">${session.initial_amount.toFixed(2)}</div>
                              </div>
                              
                              {session.status === 'closed' && (
                                <>
                                  <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Final</div>
                                    <div className="font-semibold">${session.final_amount?.toFixed(2)}</div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Diferencia</div>
                                    <div className={`font-bold ${difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                                      ${Math.abs(difference).toFixed(2)} {difference >= 0 ? '(+)' : '(-)'}
                                    </div>
                                  </div>
                                </>
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSession(session)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalle
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CashSessionDetail
        sessionId={selectedSession?.id}
        sessionData={selectedSession}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
