import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Package, Calendar, Eye, FileText } from "lucide-react";
import { useCashSessions } from "@/hooks/useCashSessions";
import { useReports } from "@/hooks/useReports";
import { CashSessionDetail } from "@/components/CashSessionDetail";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Reports() {
  const { sessions, loading: sessionsLoading } = useCashSessions();
  const { 
    salesData, 
    topProducts, 
    categoryData, 
    totalSales, 
    totalTransactions, 
    averageTicket, 
    totalProductsSold,
    loading: reportsLoading,
    fetchZReport 
  } = useReports(7);
  
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [zReportData, setZReportData] = useState<any>(null);
  const [loadingZReport, setLoadingZReport] = useState(false);

  useEffect(() => {
    loadTodayZReport();
  }, []);

  const loadTodayZReport = async () => {
    setLoadingZReport(true);
    const report = await fetchZReport();
    setZReportData(report);
    setLoadingZReport(false);
  };

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

      {reportsLoading ? (
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas Totales</p>
                  <p className="text-2xl font-bold text-success mt-1">${totalSales.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Últimos 7 días</p>
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
                  <p className="text-2xl font-bold mt-1">{totalTransactions}</p>
                  <p className="text-xs text-muted-foreground mt-1">Últimos 7 días</p>
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
                  <p className="text-2xl font-bold mt-1">${averageTicket.toFixed(2)}</p>
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
                  <p className="text-2xl font-bold mt-1">{totalProductsSold}</p>
                  <p className="text-xs text-muted-foreground mt-1">Últimos 7 días</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-subtle flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="zreport" className="space-y-4">
        <TabsList>
          <TabsTrigger value="zreport">Cierre Z</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones de Caja</TabsTrigger>
        </TabsList>

        <TabsContent value="zreport" className="space-y-4">
          {loadingZReport ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  Generando reporte...
                </div>
              </CardContent>
            </Card>
          ) : zReportData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Reporte de Cierre Z - {format(new Date(), "PPP", { locale: es })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Sesiones</p>
                      <p className="text-2xl font-bold">{zReportData.sessionCount}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Transacciones</p>
                      <p className="text-2xl font-bold">{zReportData.totalTransactions}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Ventas Totales</p>
                      <p className="text-2xl font-bold text-success">${zReportData.totalSales.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Desglose por Método de Pago</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex justify-between p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Efectivo</span>
                        <span className="font-semibold">${zReportData.cashTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Débito</span>
                        <span className="font-semibold">${zReportData.debitTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Crédito</span>
                        <span className="font-semibold">${zReportData.creditTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Transferencia</span>
                        <span className="font-semibold">${zReportData.transferTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Total Vuelto Entregado</span>
                      <span className="font-semibold text-destructive">${zReportData.totalChange.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Sesiones del Día</h3>
                    <div className="space-y-2">
                      {zReportData.sessions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No hay sesiones registradas hoy</p>
                      ) : (
                        zReportData.sessions.map((session: any) => (
                          <Card key={session.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                                      {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                                    </Badge>
                                    <span className="font-medium">{session.profiles?.full_name}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {format(new Date(session.opened_at), "HH:mm", { locale: es })}
                                    {session.closed_at && ` - ${format(new Date(session.closed_at), "HH:mm", { locale: es })}`}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Inicial</div>
                                    <div className="font-semibold">${session.initial_amount.toFixed(2)}</div>
                                  </div>
                                  {session.status === 'closed' && session.final_amount && (
                                    <>
                                      <div className="text-right">
                                        <div className="text-xs text-muted-foreground">Final</div>
                                        <div className="font-semibold">${session.final_amount.toFixed(2)}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-muted-foreground">Diferencia</div>
                                        <div className={`font-bold ${(session.final_amount - session.initial_amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                          ${Math.abs(session.final_amount - session.initial_amount).toFixed(2)}
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
                                    Ver
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          {reportsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  Cargando datos de ventas...
                </div>
              </CardContent>
            </Card>
          ) : salesData.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de ventas disponibles
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
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
            </>
          )}
        </TabsContent>

        <TabsContent value="products">
          {reportsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  Cargando productos...
                </div>
              </CardContent>
            </Card>
          ) : topProducts.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de productos disponibles
                </div>
              </CardContent>
            </Card>
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="categories">
          {reportsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  Cargando categorías...
                </div>
              </CardContent>
            </Card>
          ) : categoryData.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de categorías disponibles
                </div>
              </CardContent>
            </Card>
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Sesiones de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
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
