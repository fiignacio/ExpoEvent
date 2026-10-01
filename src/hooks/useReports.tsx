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

const OFFLINE_SALES_KEY = "offline_sales";

export function useReports(days: number = 7, endDateOverride?: Date) {
  const [salesData, setSalesData] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySales[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  const [totalProductsSold, setTotalProductsSold] = useState(0);
  const [loading, setLoading] = useState(true);

  const endKey = endDateOverride?.getTime() ?? 0;

  useEffect(() => {
    fetchReportsData();
  }, [days, endKey]);

  const getLocalSales = (): any[] => {
    try {
      const stored = localStorage.getItem(OFFLINE_SALES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const baseEnd = endDateOverride ?? new Date();
      const startDate = startOfDay(subDays(baseEnd, days - 1)).getTime();
      const endDate = endOfDay(baseEnd).getTime();

      const allSales = getLocalSales();
      const sales = allSales.filter(s => {
        const ts = s.timestamp || (s.created_at ? new Date(s.created_at).getTime() : 0);
        return ts >= startDate && ts <= endDate;
      });

      const salesByDay = new Map<string, { total: number; count: number }>();
      let totalSalesAmount = 0;
      let totalTx = sales.length;
      let totalProducts = 0;

      sales.forEach((sale) => {
        const dateObj = new Date(sale.timestamp || sale.created_at || Date.now());
        const dateKey = dateObj.toLocaleDateString('es-CL');
        const dayData = salesByDay.get(dateKey) || { total: 0, count: 0 };
        const saleTotal = Number(sale.total || 0);
        dayData.total += saleTotal;
        dayData.count += 1;
        salesByDay.set(dateKey, dayData);
        totalSalesAmount += saleTotal;

        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            totalProducts += Number(item.quantity || 0);
          });
        }
      });

      const dailySalesArray: DailySales[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(endDateOverride ?? new Date(), i);
        const dateKey = date.toLocaleDateString('es-CL');
        const dayName = date.toLocaleDateString('es-CL', { weekday: 'short' });
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

      const productMap = new Map<string, { quantity: number; revenue: number }>();
      sales.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            const name = item.name || "Producto";
            const existing = productMap.get(name) || { quantity: 0, revenue: 0 };
            const qty = Number(item.quantity || 0);
            const price = Number(item.price || 0);
            existing.quantity += qty;
            existing.revenue += qty * price;
            productMap.set(name, existing);
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

      const categoryMap = new Map<string, number>();
      sales.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            const category = item.category || 'General';
            const existing = categoryMap.get(category) || 0;
            const qty = Number(item.quantity || 0);
            const price = Number(item.price || 0);
            categoryMap.set(category, existing + (qty * price));
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
      console.error("Error computing reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchZReport = async (date?: Date): Promise<ZReport> => {
    const targetDate = date || new Date();
    const startDate = startOfDay(targetDate).getTime();
    const endDate = endOfDay(targetDate).getTime();

    const sales = getLocalSales().filter(s => {
      const ts = s.timestamp || (s.created_at ? new Date(s.created_at).getTime() : 0);
      return ts >= startDate && ts <= endDate;
    });

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

    sales.forEach((sale) => {
      const saleTotal = Number(sale.total || 0);
      totalSales += saleTotal;
      totalChange += Number(sale.changeAmount || sale.change_amount || 0);

      if (sale.paid_in_usd && sale.usd_amount) {
        usdSalesCount++;
        usdTotalReceived += Number(sale.usd_amount);
      }

      const method = (sale.paymentMethod || sale.payment_method || 'efectivo').toLowerCase();
      if (method === 'efectivo') cashTotal += saleTotal;
      else if (method === 'debito') debitTotal += saleTotal;
      else if (method === 'credito') creditTotal += saleTotal;
      else if (method === 'transferencia') transferTotal += saleTotal;
      else if (method === 'mixto') {
        mixtoTotal += saleTotal;
        const cashAmount = Number(sale.cash_amount) || 0;
        mixtoCashTotal += cashAmount;
        mixtoCardTotal += saleTotal - cashAmount;
      }
    });

    return {
      sessionCount: 1,
      totalSales,
      totalTransactions: sales.length,
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
      sessions: [{ id: "session-001", opened_at: new Date().toISOString(), profiles: { full_name: "Cajero Evento" } }]
    };
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
