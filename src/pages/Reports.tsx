import { useState, useEffect } from "react";
import { EventBackupDialog } from "@/components/EventBackupDialog";
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
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Package, Calendar, Eye, FileText, RefreshCw, Users, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import * as XLSX from 'xlsx';
import { useCashSessions } from "@/hooks/useCashSessions";
import { useReports } from "@/hooks/useReports";
import { useReportsComparison } from "@/hooks/useReportsComparison";
import { CashSessionDetail } from "@/components/CashSessionDetail";
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PeriodType = "7days" | "14days" | "30days" | "thisMonth" | "thisWeek" | "specificMonth" | "custom";

export default function Reports() {
  const { sessions, loading: sessionsLoading, fetchSessions } = useCashSessions();
  const [periodType, setPeriodType] = useState<PeriodType>("7days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeDays, setActiveDays] = useState(7);
  const [endDateOverride, setEndDateOverride] = useState<Date | undefined>(undefined);
  
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
  } = useReports(activeDays, endDateOverride);
  
  const {
    comparison,
    dailyComparison,
    paymentMethodsComparison,
    loading: comparisonLoading,
    refresh: refreshComparison
  } = useReportsComparison(activeDays, endDateOverride);
  
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
    let newEnd: Date | undefined = undefined;
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
      case "thisMonth": {
        const monthStart = startOfMonth(today);
        setActiveDays(differenceInCalendarDays(today, monthStart) + 1);
        break;
      }
      case "thisWeek": {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        setActiveDays(differenceInCalendarDays(today, weekStart) + 1);
        break;
      }
      case "specificMonth":
        if (selectedMonth) {
          const [yr, mo] = selectedMonth.split('-').map(Number);
          const mStart = new Date(yr, mo - 1, 1);
          const mEnd = endOfMonth(mStart);
          setActiveDays(differenceInCalendarDays(mEnd, mStart) + 1);
          newEnd = mEnd;
        }
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const [startYear, startMonth, startDay] = customStartDate.split('-').map(Number);
          const [endYear, endMonth, endDay] = customEndDate.split('-').map(Number);
          const start = new Date(startYear, startMonth - 1, startDay);
          const end = new Date(endYear, endMonth - 1, endDay);
          setActiveDays(differenceInCalendarDays(end, start) + 1);
          newEnd = end;
        }
        break;
    }
    setEndDateOverride(newEnd);
    fetchSupplierSales();
  }, [periodType, customStartDate, customEndDate, selectedMonth]);

  // Compute the active report date range, normalized to user's local timezone.
  // Always returns startDate at 00:00:00 and endDate at 23:59:59.999 of the local day.
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (periodType) {
      case "thisMonth":
        startDate = startOfMonth(today);
        endDate = today;
        break;
      case "thisWeek":
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = today;
        break;
      case "specificMonth":
        if (selectedMonth) {
          const [yr, mo] = selectedMonth.split('-').map(Number);
          // Day 1 of month, local time
          startDate = new Date(yr, mo - 1, 1);
          // Day 0 of next month = last day of selected month, local time
          endDate = new Date(yr, mo, 0);
        } else {
          startDate = subDays(today, activeDays - 1);
          endDate = today;
        }
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const [startYear, startMonth, startDay] = customStartDate.split('-').map(Number);
          const [endYear, endMonth, endDay] = customEndDate.split('-').map(Number);
          startDate = new Date(startYear, startMonth - 1, startDay);
          endDate = new Date(endYear, endMonth - 1, endDay);
        } else {
          startDate = subDays(today, 7);
          endDate = today;
        }
        break;
      default:
        startDate = subDays(today, activeDays - 1);
        endDate = today;
    }

    // Normalize to inclusive local-day boundaries
    startDate = new Date(startDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(endDate);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  };

  const fetchSupplierSales = async () => {
    setLoadingSupplierData(true);
    try {
      const { startDate, endDate } = getDateRange();

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
      refreshComparison(),
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
      case "specificMonth": {
        if (!selectedMonth) return "Mes específico";
        const [yr, mo] = selectedMonth.split('-').map(Number);
        return format(new Date(yr, mo - 1, 1), "MMMM yyyy", { locale: es });
      }
      case "custom": return "Personalizado";
      default: return "Últimos 7 días";
    }
  };

  const exportToExcel = async () => {
    try {
      const { startDate, endDate } = getDateRange();


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
        
        const [yKey, mKey, dKey] = dateKey.split('-').map(Number);
        const localDate = new Date(yKey, mKey - 1, dKey);
        dailyData.push({
          Fecha: format(localDate, 'PPP', { locale: es }),
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

      // Read products from local storage for mapping
      let localProds: any[] = [];
      try {
        const storedProds = localStorage.getItem("expoventas_products");
        if (storedProds) localProds = JSON.parse(storedProds);
      } catch {}
      const productsMap = new Map(localProds.map((p: any) => [p.id, { name: p.name, sku: p.sku }]));

      // Detailed transactions sheet - one row per product sold
      const transactionsData: any[] = [];
      detailedSales?.forEach(sale => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        items.forEach((item: any) => {
          const product = productsMap.get(item.id);
          const row: Record<string, any> = {
            Fecha: format(new Date(sale.created_at), 'PPP HH:mm', { locale: es }),
            Usuario: profilesMap.get(sale.user_id) || 'N/A',
            Producto: product?.name || item.name || 'Producto desconocido',
            SKU: product?.sku || item.sku || 'N/A',
            Cantidad: item.quantity || 1,
            'Precio Unitario (CLP)': `$${(item.price || 0).toLocaleString('es-CL')}`,
            'Subtotal Producto (CLP)': `$${((item.price || 0) * (item.quantity || 1)).toLocaleString('es-CL')}`,
            'Método de Pago': sale.payment_method,
            'Total Venta (CLP)': `$${sale.total.toLocaleString('es-CL')}`,
            'ID Venta': sale.id.slice(0, 8),
          };
          
          // Add mixed payment breakdown if applicable
          if (sale.payment_method === 'mixto' && sale.cash_amount) {
            row['Efectivo (CLP)'] = `$${Number(sale.cash_amount).toLocaleString('es-CL')}`;
            row['Tarjeta (CLP)'] = `$${(sale.total - Number(sale.cash_amount)).toLocaleString('es-CL')}`;
          }
          
          // Add USD info if paid in USD
          if (sale.paid_in_usd && sale.usd_amount) {
            row['Pagado en USD'] = 'Sí';
            row['Monto USD'] = `$${Number(sale.usd_amount).toFixed(2)} USD`;
            row['Tasa Cambio'] = `$${Number(sale.exchange_rate_used).toLocaleString('es-CL')}`;
          }
          
          transactionsData.push(row);
        });
      });
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

      // Generate file via Blob + anchor download (more reliable on PWAs/installed apps)
      const fileName = `reporte_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      toast.success("Reporte exportado correctamente");
    } catch (error: any) {
      console.error("Error exporting report:", error);
      toast.error("Error al exportar el reporte");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-6">
      {/* Header Section - Responsive */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Reportes y Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Análisis detallado de tu negocio y ventas del evento</p>
          </div>
          <EventBackupDialog />
        </div>
        
        {/* Filters - Stack on mobile, wrap on tablet */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <Select value={periodType} onValueChange={(v: PeriodType) => setPeriodType(v)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisWeek">Esta semana</SelectItem>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="14days">Últimos 14 días</SelectItem>
              <SelectItem value="thisMonth">Este mes</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="specificMonth">Mes específico</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodType === "specificMonth" && (
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-40 text-sm"
            />
          )}
          
          {periodType === "custom" && (
            <>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full sm:w-32 text-sm"
              />
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full sm:w-32 text-sm"
              />
            </>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing || reportsLoading}
            size="sm"
            className="h-9 sm:h-10"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-2">Actualizar</span>
          </Button>
          
          <Button 
            onClick={exportToExcel}
            disabled={reportsLoading}
            size="sm"
            className="h-9 sm:h-10"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      {reportsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-muted rounded w-16 sm:w-24"></div>
                  <div className="h-6 bg-muted rounded w-20 sm:w-32"></div>
                  <div className="h-2 bg-muted rounded w-12 sm:w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Ventas Totales</p>
                  <p className="text-base sm:text-xl lg:text-2xl font-bold text-success mt-0.5 sm:mt-1 truncate">
                    ${totalSales.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </p>
                  {comparison && (
                    <div className={`flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 ${comparison.changes.sales >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {comparison.changes.sales >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{Math.abs(comparison.changes.sales).toFixed(1)}% vs anterior</span>
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-gradient-success flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Transacciones</p>
                  <p className="text-base sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1">{totalTransactions}</p>
                  {comparison && (
                    <div className={`flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 ${comparison.changes.transactions >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {comparison.changes.transactions >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{Math.abs(comparison.changes.transactions).toFixed(1)}% vs anterior</span>
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Ticket Promedio</p>
                  <p className="text-base sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 truncate">
                    ${averageTicket.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </p>
                  {comparison && (
                    <div className={`flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 ${comparison.changes.averageTicket >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {comparison.changes.averageTicket >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{Math.abs(comparison.changes.averageTicket).toFixed(1)}% vs anterior</span>
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-gradient-warning flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Productos Vendidos</p>
                  <p className="text-base sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1">{totalProductsSold.toLocaleString('es-CL')}</p>
                  {comparison && (
                    <div className={`flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 ${comparison.changes.productsSold >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {comparison.changes.productsSold >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{Math.abs(comparison.changes.productsSold).toFixed(1)}% vs anterior</span>
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-gradient-subtle flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="zreport" className="space-y-3 sm:space-y-4">
        <TabsList className="grid grid-cols-4 sm:flex sm:flex-wrap h-auto gap-1 p-1 w-full">
          <TabsTrigger value="zreport" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">Cierre Z</TabsTrigger>
          <TabsTrigger value="comparison" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">Comparativa</TabsTrigger>
          <TabsTrigger value="sales" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">Ventas</TabsTrigger>
          <TabsTrigger value="products" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">Productos</TabsTrigger>
          <TabsTrigger value="categories" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">Categorías</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">Proveedores</TabsTrigger>
          <TabsTrigger value="sessions" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">Sesiones</TabsTrigger>
        </TabsList>

        <TabsContent value="zreport" className="space-y-4">
          {loadingZReport ? (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  Generando reporte...
                </div>
              </CardContent>
            </Card>
          ) : zReportData ? (
            <>
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="truncate">Reporte de Cierre Z - {format(new Date(), "PPP", { locale: es })}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
                      <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Total Sesiones</p>
                      <p className="text-base sm:text-2xl font-bold truncate">{zReportData.sessionCount}</p>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
                      <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Transacciones</p>
                      <p className="text-base sm:text-2xl font-bold truncate">{zReportData.totalTransactions}</p>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
                      <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Ventas Totales</p>
                      <p className="text-sm sm:text-2xl font-bold text-success truncate">${zReportData.totalSales.toLocaleString('es-CL')}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3 sm:pt-4">
                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Desglose por Método de Pago</h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="flex justify-between items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm min-w-0">
                        <span className="text-muted-foreground truncate">Efectivo</span>
                        <span className="font-semibold truncate">${zReportData.cashTotal.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm min-w-0">
                        <span className="text-muted-foreground truncate">Débito</span>
                        <span className="font-semibold truncate">${zReportData.debitTotal.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm min-w-0">
                        <span className="text-muted-foreground truncate">Crédito</span>
                        <span className="font-semibold truncate">${zReportData.creditTotal.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm min-w-0">
                        <span className="text-muted-foreground truncate">Transferencia</span>
                        <span className="font-semibold truncate">${zReportData.transferTotal.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 sm:pt-4">
                    <div className="flex justify-between items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm min-w-0">
                      <span className="text-muted-foreground truncate">Total Vuelto Entregado</span>
                      <span className="font-semibold text-destructive truncate">${zReportData.totalChange.toLocaleString('es-CL')}</span>
                    </div>
                  </div>

                  {/* Mixto Breakdown */}
                  {zReportData.mixtoTotal > 0 && (
                    <div className="border-t pt-3 sm:pt-4">
                      <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Desglose de Pagos Mixtos</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm text-center">
                          <span className="text-muted-foreground">Total Mixto</span>
                          <span className="font-semibold">${zReportData.mixtoTotal.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex flex-col p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm text-center">
                          <span className="text-muted-foreground">Efectivo</span>
                          <span className="font-semibold text-success">${zReportData.mixtoCashTotal.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex flex-col p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm text-center">
                          <span className="text-muted-foreground">Tarjeta</span>
                          <span className="font-semibold text-primary">${zReportData.mixtoCardTotal.toLocaleString('es-CL')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* USD Sales */}
                  {zReportData.usdSalesCount > 0 && (
                    <div className="border-t pt-3 sm:pt-4">
                      <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Ventas en USD</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm text-center">
                          <span className="text-muted-foreground">Transacciones</span>
                          <span className="font-semibold">{zReportData.usdSalesCount}</span>
                        </div>
                        <div className="flex flex-col p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm text-center">
                          <span className="text-muted-foreground">Total USD</span>
                          <span className="font-semibold text-success">${zReportData.usdTotalReceived.toFixed(2)} USD</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3 sm:pt-4">
                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Sesiones del Día</h3>
                    <div className="space-y-2">
                      {zReportData.sessions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4 text-sm">No hay sesiones registradas hoy</p>
                      ) : (
                        zReportData.sessions.map((session: any) => (
                          <Card key={session.id}>
                            <CardContent className="p-3">
                              <div className="flex flex-col gap-2 sm:gap-3">
                                {/* Header row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={session.status === 'open' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                                    {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                                  </Badge>
                                  <span className="font-medium text-xs sm:text-sm truncate">{session.profiles?.full_name}</span>
                                  <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
                                    {format(new Date(session.opened_at), "HH:mm", { locale: es })}
                                    {session.closed_at && ` - ${format(new Date(session.closed_at), "HH:mm", { locale: es })}`}
                                  </span>
                                </div>
                                
                                {/* Amounts grid */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="bg-muted/50 rounded-lg px-2 py-1 sm:px-3 sm:py-2">
                                    <div className="text-[10px] sm:text-xs text-muted-foreground">Inicial</div>
                                    <div className="font-semibold text-xs sm:text-sm">${session.initial_amount.toLocaleString('es-CL')}</div>
                                  </div>
                                  {session.status === 'closed' && session.final_amount && (
                                    <>
                                      <div className="bg-muted/50 rounded-lg px-2 py-1 sm:px-3 sm:py-2">
                                        <div className="text-[10px] sm:text-xs text-muted-foreground">Final</div>
                                        <div className="font-semibold text-xs sm:text-sm">${session.final_amount.toLocaleString('es-CL')}</div>
                                      </div>
                                    </>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewSession(session)}
                                    className="ml-auto h-7 sm:h-8 text-xs"
                                  >
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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

        {/* Tab de comparación con período anterior */}
        <TabsContent value="comparison" className="space-y-4">
          {comparisonLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  Cargando datos comparativos...
                </div>
              </CardContent>
            </Card>
          ) : !comparison ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos disponibles para comparar
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Resumen comparativo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Comparación vs Período Anterior
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Período Actual</p>
                      <p className="text-2xl font-bold text-success">${comparison.currentPeriod.sales.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-muted-foreground">{comparison.currentPeriod.transactions} transacciones</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Período Anterior</p>
                      <p className="text-2xl font-bold">${comparison.previousPeriod.sales.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-muted-foreground">{comparison.previousPeriod.transactions} transacciones</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Variación Ventas</p>
                      <p className={`text-2xl font-bold flex items-center gap-1 ${comparison.changes.sales >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {comparison.changes.sales >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        {Math.abs(comparison.changes.sales).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Var. Ticket Promedio</p>
                      <p className={`text-2xl font-bold flex items-center gap-1 ${comparison.changes.averageTicket >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {comparison.changes.averageTicket >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        {Math.abs(comparison.changes.averageTicket).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico comparativo diario */}
              {dailyComparison.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ventas: Período Actual vs Anterior</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={dailyComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => `$${value.toLocaleString('es-CL')}`}
                        />
                        <Legend />
                        <Bar dataKey="currentPeriod" fill="#10b981" name="Período Actual" />
                        <Line type="monotone" dataKey="previousPeriod" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" name="Período Anterior" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Comparación por método de pago */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparación por Método de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(paymentMethodsComparison.current).map(([method, currentValue]) => {
                      const previousValue = paymentMethodsComparison.previous[method] || 0;
                      const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : (currentValue > 0 ? 100 : 0);
                      const methodLabels: Record<string, string> = {
                        efectivo: 'Efectivo',
                        debito: 'Débito',
                        credito: 'Crédito',
                        transferencia: 'Transferencia',
                        mixto: 'Mixto'
                      };
                      return (
                        <div key={method} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">{methodLabels[method]}</p>
                          <p className="text-lg font-bold">${currentValue.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                          <div className={`flex items-center gap-1 text-xs ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{Math.abs(change).toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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
