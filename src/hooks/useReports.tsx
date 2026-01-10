import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOfDay, endOfDay, subDays } from "date-fns";

interface DailySales {
  date: string;
  name: string;
  ventas: number;
  transacciones: number;
}

interface TopProduct {
  name: string;
  ventas: number;
  ingresos: number;
}

interface CategorySales {
  name: string;
  value: number;
  color: string;
}

interface ZReport {
  sessionCount: number;
  totalSales: number;
  totalTransactions: number;
  cashTotal: number;
  debitTotal: number;
  creditTotal: number;
  transferTotal: number;
  mixtoTotal: number;
  mixtoCashTotal: number;
  mixtoCardTotal: number;
  totalChange: number;
  usdSalesCount: number;
  usdTotalReceived: number;
  sessions: any[];
}

const CATEGORY_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16"
];

export function useReports(days: number = 7) {
  const [salesData, setSalesData] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySales[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  const [totalProductsSold, setTotalProductsSold] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
  }, [days]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const startDate = startOfDay(subDays(new Date(), days - 1));
      const endDate = endOfDay(new Date());

      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from('offline_sales')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Process sales by day
      const salesByDay = new Map<string, { total: number; count: number }>();
      let totalSalesAmount = 0;
      let totalTx = sales?.length || 0;
      let totalProducts = 0;

      sales?.forEach((sale) => {
        const dateKey = new Date(sale.created_at).toLocaleDateString('es-MX');
        const dayData = salesByDay.get(dateKey) || { total: 0, count: 0 };
        dayData.total += sale.total;
        dayData.count += 1;
        salesByDay.set(dateKey, dayData);
        totalSalesAmount += sale.total;

        // Count products sold
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            totalProducts += item.quantity || 0;
          });
        }
      });

      // Create daily sales array
      const dailySalesArray: DailySales[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateKey = date.toLocaleDateString('es-MX');
        const dayName = date.toLocaleDateString('es-MX', { weekday: 'short' });
        const dayData = salesByDay.get(dateKey) || { total: 0, count: 0 };
        
        dailySalesArray.push({
          date: dateKey,
          name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          ventas: Math.round(dayData.total),
          transacciones: dayData.count
        });
      }

      setSalesData(dailySalesArray);
      setTotalSales(totalSalesAmount);
      setTotalTransactions(totalTx);
      setAverageTicket(totalTx > 0 ? totalSalesAmount / totalTx : 0);
      setTotalProductsSold(totalProducts);

      // Process top products
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      sales?.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            const existing = productMap.get(item.name) || { quantity: 0, revenue: 0 };
            existing.quantity += item.quantity || 0;
            existing.revenue += (item.quantity || 0) * (item.price || 0);
            productMap.set(item.name, existing);
          });
        }
      });

      const topProductsArray: TopProduct[] = Array.from(productMap.entries())
        .map(([name, data]) => ({
          name,
          ventas: data.quantity,
          ingresos: Math.round(data.revenue)
        }))
        .sort((a, b) => b.ingresos - a.ingresos)
        .slice(0, 10);

      setTopProducts(topProductsArray);

      // Process category sales
      const categoryMap = new Map<string, number>();
      sales?.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            const category = item.category || 'Sin Categoría';
            const existing = categoryMap.get(category) || 0;
            categoryMap.set(category, existing + ((item.quantity || 0) * (item.price || 0)));
          });
        }
      });

      const totalCategorySales = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
      const categoryDataArray: CategorySales[] = Array.from(categoryMap.entries())
        .map(([name, value], index) => ({
          name,
          value: totalCategorySales > 0 ? Math.round((value / totalCategorySales) * 100) : 0,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
        }))
        .sort((a, b) => b.value - a.value);

      setCategoryData(categoryDataArray);

    } catch (error: any) {
      console.error("Error fetching reports data:", error);
      toast.error("Error al cargar datos de reportes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchZReport = async (date?: Date): Promise<ZReport> => {
    try {
      const targetDate = date || new Date();
      const startDate = startOfDay(targetDate);
      const endDate = endOfDay(targetDate);

      // Fetch sessions for the day
      const { data: sessions, error: sessionsError } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .gte('opened_at', startDate.toISOString())
        .lte('opened_at', endDate.toISOString())
        .order('opened_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch user profiles separately
      const userIds = [...new Set(sessions?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Create a map of user_id to full_name
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Fetch sales for the day
      const { data: sales, error: salesError } = await supabase
        .from('offline_sales')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (salesError) throw salesError;

      // Calculate totals
      let cashTotal = 0;
      let debitTotal = 0;
      let creditTotal = 0;
      let transferTotal = 0;
      let mixtoTotal = 0;
      let mixtoCashTotal = 0;
      let mixtoCardTotal = 0;
      let totalChange = 0;
      let totalSales = 0;
      let usdSalesCount = 0;
      let usdTotalReceived = 0;

      sales?.forEach((sale) => {
        totalSales += sale.total;
        totalChange += sale.change_amount || 0;

        // Track USD payments
        if (sale.paid_in_usd && sale.usd_amount) {
          usdSalesCount++;
          usdTotalReceived += Number(sale.usd_amount);
        }

        const method = sale.payment_method.toLowerCase();
        if (method === 'efectivo') cashTotal += sale.total;
        else if (method === 'debito') debitTotal += sale.total;
        else if (method === 'credito') creditTotal += sale.total;
        else if (method === 'transferencia') transferTotal += sale.total;
        else if (method === 'mixto') {
          mixtoTotal += sale.total;
          const cashAmount = Number(sale.cash_amount) || 0;
          mixtoCashTotal += cashAmount;
          mixtoCardTotal += sale.total - cashAmount;
        }
      });

      // Enrich sessions with user names
      const enrichedSessions = sessions?.map(session => ({
        ...session,
        profiles: { full_name: profileMap.get(session.user_id) || 'Usuario Desconocido' }
      })) || [];

      return {
        sessionCount: sessions?.length || 0,
        totalSales,
        totalTransactions: sales?.length || 0,
        cashTotal,
        debitTotal,
        creditTotal,
        transferTotal,
        mixtoTotal,
        mixtoCashTotal,
        mixtoCardTotal,
        totalChange,
        usdSalesCount,
        usdTotalReceived,
        sessions: enrichedSessions
      };
    } catch (error: any) {
      console.error("Error fetching Z report:", error);
      toast.error("Error al generar reporte Z: " + error.message);
      return {
        sessionCount: 0,
        totalSales: 0,
        totalTransactions: 0,
        cashTotal: 0,
        debitTotal: 0,
        creditTotal: 0,
        transferTotal: 0,
        mixtoTotal: 0,
        mixtoCashTotal: 0,
        mixtoCardTotal: 0,
        totalChange: 0,
        usdSalesCount: 0,
        usdTotalReceived: 0,
        sessions: []
      };
    }
  };

  return {
    salesData,
    topProducts,
    categoryData,
    totalSales,
    totalTransactions,
    averageTicket,
    totalProductsSold,
    loading,
    fetchZReport,
    refresh: fetchReportsData
  };
}
