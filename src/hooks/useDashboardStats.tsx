import { useState, useEffect, useCallback } from "react";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { Product } from "@/types/product";
import { DEFAULT_EVENT_PRODUCTS } from "@/utils/defaultProducts";

interface DashboardStats {
  salesToday: number;
  salesYesterday: number;
  salesWeek: number;
  salesMonth: number;
  transactionsToday: number;
  averageTicketToday: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    sku: string;
  }>;
  topProductsToday: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  activeCashSession: {
    id: string;
    initialAmount: number;
    openedAt: string;
    userName?: string;
  } | null;
  pendingTransactions: number;
  pendingTransactionsAmount: number;
  growthPercentage: number;
}

const LOCAL_PRODUCTS_KEY = "expoventas_products";
const OFFLINE_SALES_KEY = "offline_sales";

export function useDashboardStats(lowStockThreshold: number = 10) {
  const [stats, setStats] = useState<DashboardStats>({
    salesToday: 0,
    salesYesterday: 0,
    salesWeek: 0,
    salesMonth: 0,
    transactionsToday: 0,
    averageTicketToday: 0,
    lowStockProducts: [],
    topProductsToday: [],
    activeCashSession: null,
    pendingTransactions: 0,
    pendingTransactionsAmount: 0,
    growthPercentage: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now).getTime();
      const todayEnd = endOfDay(now).getTime();
      const yesterdayStart = startOfDay(subDays(now, 1)).getTime();
      const yesterdayEnd = endOfDay(subDays(now, 1)).getTime();
      const weekStart = startOfDay(subDays(now, 7)).getTime();
      const monthStart = startOfDay(subDays(now, 30)).getTime();

      // 1. Cargar productos desde almacenamiento local (expoventas_products)
      let products: Product[] = [];
      try {
        const storedProducts = localStorage.getItem(LOCAL_PRODUCTS_KEY);
        if (storedProducts) {
          products = JSON.parse(storedProducts);
        } else {
          products = DEFAULT_EVENT_PRODUCTS;
        }
      } catch {
        products = DEFAULT_EVENT_PRODUCTS;
      }

      // Productos con stock bajo (exclusivamente del inventario actual)
      const lowStockProducts = products
        .filter(p => Number(p.stock) <= lowStockThreshold)
        .sort((a, b) => Number(a.stock) - Number(b.stock))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
          sku: p.sku
        }));

      // 2. Cargar ventas desde almacenamiento local (offline_sales)
      let sales: any[] = [];
      try {
        const storedSales = localStorage.getItem(OFFLINE_SALES_KEY);
        if (storedSales) {
          sales = JSON.parse(storedSales);
        }
      } catch {
        sales = [];
      }

      // Filtrar ventas por rango
      const todaySales = sales.filter(s => {
        const ts = s.timestamp || (s.created_at ? new Date(s.created_at).getTime() : 0);
        return ts >= todayStart && ts <= todayEnd;
      });

      const yesterdaySales = sales.filter(s => {
        const ts = s.timestamp || (s.created_at ? new Date(s.created_at).getTime() : 0);
        return ts >= yesterdayStart && ts <= yesterdayEnd;
      });

      const weekSales = sales.filter(s => {
        const ts = s.timestamp || (s.created_at ? new Date(s.created_at).getTime() : 0);
        return ts >= weekStart && ts <= todayEnd;
      });

      const monthSales = sales.filter(s => {
        const ts = s.timestamp || (s.created_at ? new Date(s.created_at).getTime() : 0);
        return ts >= monthStart && ts <= todayEnd;
      });

      const salesToday = todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const salesYesterday = yesterdaySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const salesWeek = weekSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const salesMonth = monthSales.reduce((sum, s) => sum + Number(s.total || 0), 0);

      const transactionsToday = todaySales.length;
      const averageTicketToday = transactionsToday > 0 ? salesToday / transactionsToday : 0;

      const growthPercentage = salesYesterday > 0 
        ? ((salesToday - salesYesterday) / salesYesterday) * 100 
        : salesToday > 0 ? 100 : 0;

      // Productos más vendidos hoy
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      todaySales.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          (sale.items as any[]).forEach((item) => {
            const itemName = item.name || "Producto";
            const existing = productMap.get(itemName) || { quantity: 0, revenue: 0 };
            const qty = Number(item.quantity || 0);
            const price = Number(item.price || 0);
            existing.quantity += qty;
            existing.revenue += qty * price;
            productMap.set(itemName, existing);
          });
        }
      });

      const topProductsToday = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        salesToday,
        salesYesterday,
        salesWeek,
        salesMonth,
        transactionsToday,
        averageTicketToday,
        lowStockProducts,
        topProductsToday,
        activeCashSession: {
          id: "session-001",
          initialAmount: 0,
          openedAt: new Date().toISOString(),
          userName: "Cajero Evento"
        },
        pendingTransactions: 0,
        pendingTransactionsAmount: 0,
        growthPercentage
      });
    } catch (error) {
      console.error("Error computing local dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, [lowStockThreshold]);

  useEffect(() => {
    fetchStats();
    
    // Escuchar actualizaciones de almacenamiento local
    const handleStorageChange = () => fetchStats();
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchStats]);

  return { stats, loading, refresh: fetchStats };
}

