import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { es } from "date-fns/locale";

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

export interface SoldProduct {
  id?: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalRevenue: number;
  cost: number;
  totalCost: number;
  profit: number;
  margin: number;
  percentageOfSales: number;
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

export function parseSafeDate(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const formatted = val.includes(' ') && !val.includes('T') ? val.replace(' ', 'T') : val;
    const ts = new Date(formatted).getTime();
    return isNaN(ts) ? 0 : ts;
  }
  if (val instanceof Date) return val.getTime();
  return 0;
}

export const getLocalSales = (): any[] => {
  try {
    const stored = localStorage.getItem(OFFLINE_SALES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const getAllCombinedSales = async (): Promise<any[]> => {
  const local = getLocalSales();
  const salesMap = new Map<string, any>();
  local.forEach(s => salesMap.set(s.id, {
    ...s,
    paymentMethod: s.paymentMethod || s.payment_method || "efectivo",
    payment_method: s.payment_method || s.paymentMethod || "efectivo",
    total: Number(s.total || 0),
    timestamp: parseSafeDate(s.timestamp || s.created_at)
  }));

  try {
    const { data, error } = await supabase.from("offline_sales").select("*");
    if (!error && Array.isArray(data)) {
      data.forEach((s: any) => {
        if (!salesMap.has(s.id)) {
          salesMap.set(s.id, {
            id: s.id,
            sessionId: s.session_id,
            items: s.items || [],
            subtotal: Number(s.subtotal || 0),
            tax: Number(s.tax || 0),
            total: Number(s.total || 0),
            paymentMethod: s.payment_method || "efectivo",
            payment_method: s.payment_method || "efectivo",
            changeAmount: Number(s.change_amount || 0),
            cash_amount: Number(s.cash_amount || 0),
            paid_in_usd: s.paid_in_usd,
            usd_amount: Number(s.usd_amount || 0),
            created_at: s.created_at,
            timestamp: parseSafeDate(s.created_at || s.timestamp)
          });
        }
      });
    }
  } catch (e) {
    console.warn("Could not fetch remote sales for report, using local:", e);
  }

  return Array.from(salesMap.values());
};

export function useReports(days: number = 7, endDateOverride?: Date) {
  const [salesData, setSalesData] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [allProductsSold, setAllProductsSold] = useState<SoldProduct[]>([]);
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

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const baseEnd = endDateOverride ?? new Date();
      const startDate = startOfDay(subDays(baseEnd, days - 1)).getTime();
      const endDate = endOfDay(baseEnd).getTime();

      const allSales = await getAllCombinedSales();
      const sales = allSales.filter(s => {
        const ts = parseSafeDate(s.timestamp || s.created_at);
        return ts >= startDate && ts <= endDate;
      });

      const salesByDay = new Map<string, { total: number; count: number }>();
      let totalSalesAmount = 0;
      let totalTx = sales.length;
      let totalProducts = 0;

      sales.forEach((sale) => {
        const ts = sale.timestamp || parseSafeDate(sale.created_at) || Date.now();
        const dateObj = new Date(ts);
        const dateKey = format(dateObj, 'yyyy-MM-dd');
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
      const numDays = Math.max(1, days);
      for (let i = numDays - 1; i >= 0; i--) {
        const date = subDays(baseEnd, i);
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayLabel = numDays <= 14 
          ? format(date, "EEE dd/MM", { locale: es })
          : format(date, "dd/MM", { locale: es });
        const capitalizedLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
        const dayData = salesByDay.get(dateKey) || { total: 0, count: 0 };
        
        dailySalesArray.push({
          date: dateKey,
          name: capitalizedLabel,
          ventas: Math.round(dayData.total),
          transacciones: dayData.count
        });
      }

      setSalesData(dailySalesArray);
      setTotalSales(totalSalesAmount);
      setTotalTransactions(totalTx);
      setAverageTicket(totalTx > 0 ? totalSalesAmount / totalTx : 0);
      setTotalProductsSold(totalProducts);

      // Leer catálogo de productos desde localStorage para enriquecer SKU, categoría y costo
      let catalogMap = new Map<string, any>();
      try {
        const stored = localStorage.getItem("expoventas_products");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: any) => {
              if (p.id) catalogMap.set(p.id, p);
              if (p.sku) catalogMap.set(p.sku.toLowerCase(), p);
              if (p.name) catalogMap.set(p.name.toLowerCase(), p);
            });
          }
        }
      } catch (e) {}

      const productAggregation = new Map<string, {
        id?: string;
        sku: string;
        name: string;
        category: string;
        quantity: number;
        revenue: number;
        cost: number;
      }>();

      sales.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            const rawId = item.id || "";
            const rawSku = item.sku || "";
            const rawName = item.name || "Producto sin nombre";

            const fromCatalog = catalogMap.get(rawId) || 
                                (rawSku ? catalogMap.get(rawSku.toLowerCase()) : null) || 
                                catalogMap.get(rawName.toLowerCase());

            const sku = rawSku || fromCatalog?.sku || "S/SKU";
            const name = rawName || fromCatalog?.name || "Producto";
            const category = item.category || fromCatalog?.category || "General";
            const cost = Number(item.cost ?? fromCatalog?.cost ?? 0);
            const price = Number(item.price || 0);
            const qty = Number(item.quantity || 0);

            const aggKey = (sku && sku !== "S/SKU") ? sku.toUpperCase() : (rawId || name.toLowerCase());

            const existing = productAggregation.get(aggKey) || {
              id: rawId || fromCatalog?.id,
              sku,
              name,
              category,
              quantity: 0,
              revenue: 0,
              cost,
            };

            existing.quantity += qty;
            existing.revenue += (qty * price);
            if (!existing.cost && cost) existing.cost = cost;
            if (existing.sku === "S/SKU" && sku && sku !== "S/SKU") existing.sku = sku;

            productAggregation.set(aggKey, existing);
          });
        }
      });

      const allSoldList: SoldProduct[] = Array.from(productAggregation.values())
        .map((p) => {
          const unitPrice = p.quantity > 0 ? Math.round(p.revenue / p.quantity) : 0;
          const totalCost = p.cost * p.quantity;
          const profit = p.revenue - totalCost;
          const margin = p.revenue > 0 ? Number(((profit / p.revenue) * 100).toFixed(1)) : 0;
          const percentageOfSales = totalSalesAmount > 0 
            ? Number(((p.revenue / totalSalesAmount) * 100).toFixed(1)) 
            : 0;

          return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            unitPrice,
            totalRevenue: Math.round(p.revenue),
            cost: p.cost,
            totalCost,
            profit,
            margin,
            percentageOfSales,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      setAllProductsSold(allSoldList);

      const topProductsArray: TopProduct[] = allSoldList
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          ventas: p.quantity,
          ingresos: p.totalRevenue
        }));

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

    const allSales = await getAllCombinedSales();
    const sales = allSales.filter(s => {
      const ts = parseSafeDate(s.timestamp || s.created_at);
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

    // Cargar sesiones de caja reales (remotas de Supabase + locales)
    let sessions: any[] = [];
    try {
      const stored = localStorage.getItem("expoventas_cash_sessions");
      const local: any[] = stored ? JSON.parse(stored) : [];
      const sessionMap = new Map<string, any>();
      local.forEach(s => sessionMap.set(s.id, { ...s, profiles: { full_name: "Cajero Evento" } }));

      const { data: remoteSessions, error: remoteErr } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .order('opened_at', { ascending: false });

      if (!remoteErr && Array.isArray(remoteSessions)) {
        remoteSessions.forEach((s: any) => {
          const localItem = sessionMap.get(s.id);
          sessionMap.set(s.id, {
            id: s.id,
            user_id: s.user_id || 'event-user-001',
            opened_at: s.opened_at,
            closed_at: s.closed_at,
            initial_amount: Number(s.initial_amount || localItem?.initial_amount || 0),
            final_amount: s.final_amount != null ? Number(s.final_amount) : (localItem?.final_amount != null ? Number(localItem.final_amount) : null),
            status: s.status || localItem?.status || 'closed',
            profiles: { full_name: "Cajero Evento" }
          });
        });
      }

      const allMerged = Array.from(sessionMap.values());
      sessions = allMerged.filter((s: any) => {
        const openTs = parseSafeDate(s.opened_at || s.created_at);
        return openTs >= startDate && openTs <= endDate;
      });
    } catch (e) {
      console.error("Error reading cash sessions for Z Report:", e);
    }

    return {
      sessionCount: sessions.length,
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
      sessions
    };
  };

  return {
    salesData,
    topProducts,
    allProductsSold,
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
