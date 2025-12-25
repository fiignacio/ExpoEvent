import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Package, Calendar, Eye, FileText, RefreshCw, Users, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { useCashSessions } from "@/hooks/useCashSessions";
import { useReports } from "@/hooks/useReports";
import { CashSessionDetail } from "@/components/CashSessionDetail";
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PeriodType = "7days" | "14days" | "30days" | "thisMonth" | "thisWeek" | "custom";

export default function Reports() {
  const { sessions, loading: sessionsLoading, fetchSessions } = useCashSessions();
  const [periodType, setPeriodType] = useState<PeriodType>("7days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeDays, setActiveDays] = useState(7);
  
  const { 
    salesData, 
    topProducts, 
    categoryData, 
    totalSales, 
    totalTransactions, 
    averageTicket, 
    totalProductsSold,
    loading: reportsLoading,
    fetchZReport,
    refresh: refreshReports
  } = useReports(activeDays);
  
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [zReportData, setZReportData] = useState<any>(null);
  const [loadingZReport, setLoadingZReport] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [supplierSalesData, setSupplierSalesData] = useState<any[]>([]);
  const [loadingSupplierData, setLoadingSupplierData] = useState(false);
  const [syncingSuppliers, setSyncingSuppliers] = useState(false);

  useEffect(() => {
    loadTodayZReport();
    fetchSupplierSales();
  }, []);

  useEffect(() => {
    // Update days based on period type
    const today = new Date();
    switch (periodType) {
      case "7days":
        setActiveDays(7);
        break;
      case "14days":
        setActiveDays(14);
        break;
      case "30days":
        setActiveDays(30);
        break;
      case "thisMonth":
        const monthStart = startOfMonth(today);
        const daysSinceMonthStart = Math.ceil((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setActiveDays(daysSinceMonthStart);
        break;
      case "thisWeek":
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const daysSinceWeekStart = Math.ceil((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setActiveDays(daysSinceWeekStart);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          setActiveDays(daysDiff);
        }
        break;
    }
    fetchSupplierSales();
  }, [periodType, customStartDate, customEndDate]);

  const fetchSupplierSales = async () => {
    setLoadingSupplierData(true);
    try {
      const today = new Date();
      let startDate: Date;
      let endDate = today;
      
      switch (periodType) {
        case "thisMonth":
          startDate = startOfMonth(today);
          break;
        case "thisWeek":
          startDate = startOfWeek(today, { weekStartsOn: 1 });
          break;
        case "custom":
          startDate = customStartDate ? new Date(customStartDate) : subDays(today, 7);
          endDate = customEndDate ? new Date(customEndDate) : today;
          break;
        default:
          startDate = subDays(today, activeDays - 1);
      }

      // Get suppliers with their linked products
      const { data: suppliers, error: suppliersError } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          customer_products (
            product_id,
            price,
            product:products (name, sku)
          )
        `)
        .eq('type', 'proveedor');

      if (suppliersError) throw suppliersError;

      // Get transactions for suppliers
      const { data: transactions, error: txError } = await supabase
        .from('customer_transactions')
        .select('*')
        .in('customer_id', suppliers?.map(s => s.id) || [])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (txError) throw txError;

      // Calculate totals per supplier
      const supplierData = suppliers?.map(supplier => {
        const supplierTx = transactions?.filter(tx => tx.customer_id === supplier.id) || [];
        const totalDebt = supplierTx
          .filter(tx => tx.type === 'debt' && tx.status === 'pending')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const totalPaid = supplierTx
          .filter(tx => tx.status === 'paid')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const pendingCount = supplierTx.filter(tx => tx.status === 'pending').length;

        return {
          id: supplier.id,
          name: supplier.name,
          productsLinked: supplier.customer_products?.length || 0,
          totalDebt,
          totalPaid,
          pendingCount,
          transactions: supplierTx
        };
      }) || [];

      setSupplierSalesData(supplierData.filter(s => s.totalDebt > 0 || s.totalPaid > 0 || s.productsLinked > 0));
    } catch (error) {
      console.error("Error fetching supplier sales:", error);
    } finally {
      setLoadingSupplierData(false);
    }
  };

  const loadTodayZReport = async () => {
    setLoadingZReport(true);
    const report = await fetchZReport();
    setZReportData(report);
    setLoadingZReport(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshReports(),
      loadTodayZReport(),
      fetchSessions(),
      fetchSupplierSales()
    ]);
    setIsRefreshing(false);
  };

  const handleSyncSupplierTransactions = async () => {
    setSyncingSuppliers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión para sincronizar");
        return;
      }

      const response = await supabase.functions.invoke('sync-supplier-transactions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      toast.success(`Sincronización completada: ${result.stats.transactionsCreated} transacciones creadas`);
      
      // Refresh supplier data
      await fetchSupplierSales();
    } catch (error: any) {
      console.error("Error syncing supplier transactions:", error);
      toast.error("Error al sincronizar: " + (error.message || "Error desconocido"));
    } finally {
      setSyncingSuppliers(false);
    }
  };

  const handleViewSession = (session: any) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

  const getPeriodLabel = () => {
    switch (periodType) {
      case "7days": return "Últimos 7 días";
      case "14days": return "Últimos 14 días";
      case "30days": return "Últimos 30 días";
      case "thisMonth": return "Este mes";
      case "thisWeek": return "Esta semana";
      case "custom": return "Personalizado";
      default: return "Últimos 7 días";
    }
  };

  const exportToExcel = async () => {
    try {
      const today = new Date();
      let startDate: Date;
      let endDate = today;
      
      switch (periodType) {
        case "thisMonth":
          startDate = startOfMonth(today);
          break;
        case "thisWeek":
          startDate = startOfWeek(today, { weekStartsOn: 1 });
          break;
        case "custom":
          startDate = customStartDate ? new Date(customStartDate) : subDays(today, 7);
          endDate = customEndDate ? new Date(customEndDate) : today;
          break;
        default:
          startDate = subDays(today, activeDays - 1);
      }

      // Fetch detailed sales
      const { data: detailedSales, error } = await supabase
        .from('offline_sales')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(detailedSales?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]));

      // Group sales by date
      const salesByDate: Record<string, any[]> = {};
      detailedSales?.forEach(sale => {
        const dateKey = format(new Date(sale.created_at), 'yyyy-MM-dd');
        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = [];
        }
        salesByDate[dateKey].push(sale);
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        { Campo: 'Período', Valor: getPeriodLabel() },
        { Campo: 'Desde', Valor: format(startDate, 'PPP', { locale: es }) },
        { Campo: 'Hasta', Valor: format(endDate, 'PPP', { locale: es }) },
        { Campo: '', Valor: '' },
        { Campo: 'Total Ventas', Valor: `$${totalSales.toFixed(2)}` },
        { Campo: 'Total Transacciones', Valor: totalTransactions },
        { Campo: 'Ticket Promedio', Valor: `$${averageTicket.toFixed(2)}` },
        { Campo: 'Productos Vendidos', Valor: totalProductsSold },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

      // Daily sales sheet
      const dailyData: any[] = [];
      Object.keys(salesByDate).sort().forEach(dateKey => {
        const daySales = salesByDate[dateKey];
        const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);
        const dayCount = daySales.length;
        
        dailyData.push({
          Fecha: format(new Date(dateKey), 'PPP', { locale: es }),
          'Número de Ventas': dayCount,
          'Total del Día': `$${dayTotal.toFixed(2)}`,
          'Efectivo': `$${daySales.filter(s => s.payment_method === 'efectivo').reduce((sum, s) => sum + s.total, 0).toFixed(2)}`,
          'Débito': `$${daySales.filter(s => s.payment_method === 'debito').reduce((sum, s) => sum + s.total, 0).toFixed(2)}`,
          'Crédito': `$${daySales.filter(s => s.payment_method === 'credito').reduce((sum, s) => sum + s.total, 0).toFixed(2)}`,
          'Transferencia': `$${daySales.filter(s => s.payment_method === 'transferencia').reduce((sum, s) => sum + s.total, 0).toFixed(2)}`,
          'Pago Mixto': `$${daySales.filter(s => s.payment_method === 'mixto').reduce((sum, s) => sum + s.total, 0).toFixed(2)}`,
        });
      });
      const wsDaily = XLSX.utils.json_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, wsDaily, 'Ventas por Día');

      // Detailed transactions sheet
      const transactionsData = detailedSales?.map(sale => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        return {
          Fecha: format(new Date(sale.created_at), 'PPP HH:mm', { locale: es }),
          Usuario: profilesMap.get(sale.user_id) || 'N/A',
          'Método de Pago': sale.payment_method,
          Subtotal: `$${sale.subtotal.toFixed(2)}`,
          Impuesto: `$${sale.tax.toFixed(2)}`,
          Total: `$${sale.total.toFixed(2)}`,
          'Vuelto': sale.change_amount ? `$${sale.change_amount.toFixed(2)}` : '$0.00',
          'Cantidad de Items': items.length,
        };
      }) || [];
      const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
      XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transacciones Detalladas');

      // Products sold sheet
      const productsData = topProducts.map(p => ({
        Producto: p.name,
        'Cantidad Vendida': p.ventas,
        'Total Ventas': `$${p.ingresos.toFixed(2)}`,
      }));
      const wsProducts = XLSX.utils.json_to_sheet(productsData);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Productos Más Vendidos');

      // Categories sheet
      const categoriesData = categoryData.map(c => ({
        Categoría: c.name,
        'Total Ventas': `$${c.value.toFixed(2)}`,
      }));
      const wsCategories = XLSX.utils.json_to_sheet(categoriesData);
      XLSX.utils.book_append_sheet(wb, wsCategories, 'Ventas por Categoría');

      // Generate file
      const fileName = `reporte_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("Reporte exportado correctamente");
    } catch (error: any) {
      console.error("Error exporting report:", error);
      toast.error("Error al exportar el reporte");
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reportes y Analytics</h1>
          <p className="text-muted-foreground mt-1">Análisis detallado de tu negocio</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodType} onValueChange={(v: PeriodType) => setPeriodType(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisWeek">Esta semana</SelectItem>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="14days">Últimos 14 días</SelectItem>
              <SelectItem value="thisMonth">Este mes</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {periodType === "custom" && (
            <>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-36"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-36"
              />
            </>
          )}
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing || reportsLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button 
            onClick={exportToExcel}
            disabled={reportsLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar a Excel
          </Button>
        </div>
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
                  <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
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
                  <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
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
                  <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
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
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full sm:w-auto sm:min-w-0">
            <TabsTrigger value="zreport" className="text-xs sm:text-sm whitespace-nowrap">Cierre Z</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs sm:text-sm whitespace-nowrap">Ventas</TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm whitespace-nowrap">Productos</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm whitespace-nowrap">Categorías</TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs sm:text-sm whitespace-nowrap">Proveedores</TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs sm:text-sm whitespace-nowrap">Sesiones</TabsTrigger>
          </TabsList>
        </div>

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
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex flex-col gap-3">
                                {/* Header row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                                    {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                                  </Badge>
                                  <span className="font-medium text-sm sm:text-base">{session.profiles?.full_name}</span>
                                  <span className="text-xs sm:text-sm text-muted-foreground ml-auto">
                                    {format(new Date(session.opened_at), "HH:mm", { locale: es })}
                                    {session.closed_at && ` - ${format(new Date(session.closed_at), "HH:mm", { locale: es })}`}
                                  </span>
                                </div>
                                
                                {/* Amounts grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                                  <div className="bg-muted/50 rounded-lg p-2">
                                    <div className="text-xs text-muted-foreground">Inicial</div>
                                    <div className="font-semibold text-sm">${session.initial_amount.toFixed(2)}</div>
                                  </div>
                                  {session.status === 'closed' && session.final_amount && (
                                    <>
                                      <div className="bg-muted/50 rounded-lg p-2">
                                        <div className="text-xs text-muted-foreground">Final</div>
                                        <div className="font-semibold text-sm">${session.final_amount.toFixed(2)}</div>
                                      </div>
                                      <div className="bg-muted/50 rounded-lg p-2">
                                        <div className="text-xs text-muted-foreground">Diferencia</div>
                                        <div className={`font-bold text-sm ${(session.final_amount - session.initial_amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                          ${Math.abs(session.final_amount - session.initial_amount).toFixed(2)}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  <div className={`${session.status === 'closed' ? '' : 'col-span-1'} flex items-end`}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewSession(session)}
                                      className="w-full"
                                    >
                                      <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                                      <span className="hidden sm:inline">Ver</span>
                                    </Button>
                                  </div>
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

        <TabsContent value="suppliers">
          <div className="mb-4">
            <Button 
              onClick={handleSyncSupplierTransactions}
              disabled={syncingSuppliers}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncingSuppliers ? 'animate-spin' : ''}`} />
              {syncingSuppliers ? 'Sincronizando...' : 'Sincronizar Transacciones de Proveedores'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Vincula automáticamente las ventas de la última semana a sus proveedores correspondientes
            </p>
          </div>
          
          {loadingSupplierData ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  Cargando datos de proveedores...
                </div>
              </CardContent>
            </Card>
          ) : supplierSalesData.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de proveedores disponibles. Usa el botón de sincronización para vincular ventas.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Resumen de Proveedores - {getPeriodLabel()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total por Pagar</p>
                      <p className="text-2xl font-bold text-destructive">
                        ${supplierSalesData.reduce((sum, s) => sum + s.totalDebt, 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Pagado</p>
                      <p className="text-2xl font-bold text-success">
                        ${supplierSalesData.reduce((sum, s) => sum + s.totalPaid, 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Proveedores Activos</p>
                      <p className="text-2xl font-bold">{supplierSalesData.length}</p>
                    </div>
                  </div>
                  
                  {/* Mobile: Cards view */}
                  <div className="space-y-3 md:hidden">
                    {supplierSalesData.map((supplier) => (
                      <div key={supplier.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{supplier.name}</span>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">{supplier.productsLinked} prod.</Badge>
                            {supplier.pendingCount > 0 ? (
                              <Badge variant="destructive" className="text-xs">{supplier.pendingCount} pend.</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">0</Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-destructive/10 rounded p-2">
                            <div className="text-xs text-muted-foreground">Por Pagar</div>
                            <div className="font-semibold text-destructive">${supplier.totalDebt.toFixed(2)}</div>
                          </div>
                          <div className="bg-success/10 rounded p-2">
                            <div className="text-xs text-muted-foreground">Pagado</div>
                            <div className="font-semibold text-success">${supplier.totalPaid.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Desktop: Table view */}
                  <div className="border rounded-lg overflow-hidden hidden md:block">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Proveedor</th>
                          <th className="text-center p-3 font-medium">Productos</th>
                          <th className="text-center p-3 font-medium">Transacciones</th>
                          <th className="text-right p-3 font-medium">Por Pagar</th>
                          <th className="text-right p-3 font-medium">Pagado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierSalesData.map((supplier) => (
                          <tr key={supplier.id} className="border-t">
                            <td className="p-3 font-medium">{supplier.name}</td>
                            <td className="p-3 text-center">
                              <Badge variant="outline">{supplier.productsLinked}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              {supplier.pendingCount > 0 ? (
                                <Badge variant="destructive">{supplier.pendingCount} pendientes</Badge>
                              ) : (
                                <Badge variant="secondary">0</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right font-semibold text-destructive">
                              ${supplier.totalDebt.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-semibold text-success">
                              ${supplier.totalPaid.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Deuda por Proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={supplierSalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalDebt" fill="#ef4444" name="Por Pagar" />
                      <Bar dataKey="totalPaid" fill="#10b981" name="Pagado" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
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
                          {/* Layout responsive: columna en móvil, fila en desktop */}
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            
                            {/* Información de la sesión */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <Badge 
                                  variant={session.status === 'open' ? 'default' : 'secondary'}
                                  className="capitalize"
                                >
                                  {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                                </Badge>
                                <span className="font-medium truncate">
                                  {session.profiles?.full_name}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{format(new Date(session.opened_at), "PPP", { locale: es })}</span>
                                </div>
                                <span className="text-xs sm:text-sm">
                                  {format(new Date(session.opened_at), "HH:mm", { locale: es })}
                                  {session.closed_at && ` - ${format(new Date(session.closed_at), "HH:mm", { locale: es })}`}
                                </span>
                              </div>
                            </div>
                            
                            {/* Montos - grid responsive */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-3 lg:gap-6">
                              <div className="text-left lg:text-right">
                                <div className="text-xs sm:text-sm text-muted-foreground">Inicial</div>
                                <div className="font-semibold text-sm sm:text-base">${session.initial_amount.toFixed(2)}</div>
                              </div>
                              
                              {session.status === 'closed' && (
                                <>
                                  <div className="text-left lg:text-right">
                                    <div className="text-xs sm:text-sm text-muted-foreground">Final</div>
                                    <div className="font-semibold text-sm sm:text-base">${session.final_amount?.toFixed(2)}</div>
                                  </div>
                                  
                                  <div className="text-left lg:text-right">
                                    <div className="text-xs sm:text-sm text-muted-foreground">Diferencia</div>
                                    <div className={`font-bold text-sm sm:text-base ${difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                                      ${Math.abs(difference).toFixed(2)} {difference >= 0 ? '(+)' : '(-)'}
                                    </div>
                                  </div>
                                </>
                              )}
                              
                              <div className="col-span-2 sm:col-span-1 lg:flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewSession(session)}
                                  className="w-full lg:w-auto"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalle
                                </Button>
                              </div>
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
