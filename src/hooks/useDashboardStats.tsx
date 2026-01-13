import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays } from "date-fns";

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
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const yesterdayStart = startOfDay(subDays(now, 1));
      const yesterdayEnd = endOfDay(subDays(now, 1));
      const weekStart = startOfDay(subDays(now, 7));
      const monthStart = startOfDay(subDays(now, 30));

      // Fetch all data in parallel
      const [
        todaySalesRes,
        yesterdaySalesRes,
        weekSalesRes,
        monthSalesRes,
        lowStockRes,
        activeSessionRes,
        pendingTransactionsRes
      ] = await Promise.all([
        // Today's sales
        supabase
          .from('offline_sales')
          .select('total, items')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString()),
        // Yesterday's sales
        supabase
          .from('offline_sales')
          .select('total')
          .gte('created_at', yesterdayStart.toISOString())
          .lte('created_at', yesterdayEnd.toISOString()),
        // Week sales
        supabase
          .from('offline_sales')
          .select('total')
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', todayEnd.toISOString()),
        // Month sales
        supabase
          .from('offline_sales')
          .select('total')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', todayEnd.toISOString()),
        // Low stock products
        supabase
          .from('products')
          .select('id, name, stock, sku')
          .lte('stock', lowStockThreshold)
          .order('stock', { ascending: true })
          .limit(10),
        // Active cash session
        supabase
          .from('cash_register_sessions')
          .select('id, initial_amount, opened_at, user_id')
          .eq('status', 'open')
          .limit(1)
          .maybeSingle(),
        // Pending customer transactions
        supabase
          .from('customer_transactions')
          .select('amount')
          .eq('status', 'pending')
          .eq('type', 'debt')
      ]);

      // Calculate today's stats
      const todaySales = todaySalesRes.data || [];
      const salesToday = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
      const transactionsToday = todaySales.length;
      const averageTicketToday = transactionsToday > 0 ? salesToday / transactionsToday : 0;

      // Yesterday's sales
      const salesYesterday = (yesterdaySalesRes.data || []).reduce((sum, s) => sum + Number(s.total), 0);

      // Week and month sales
      const salesWeek = (weekSalesRes.data || []).reduce((sum, s) => sum + Number(s.total), 0);
      const salesMonth = (monthSalesRes.data || []).reduce((sum, s) => sum + Number(s.total), 0);

      // Growth percentage (today vs yesterday)
      const growthPercentage = salesYesterday > 0 
        ? ((salesToday - salesYesterday) / salesYesterday) * 100 
        : salesToday > 0 ? 100 : 0;

      // Top products today
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      todaySales.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          (sale.items as any[]).forEach((item) => {
            const existing = productMap.get(item.name) || { quantity: 0, revenue: 0 };
            existing.quantity += item.quantity || 0;
            existing.revenue += (item.quantity || 0) * (item.price || 0);
            productMap.set(item.name, existing);
          });
        }
      });

      const topProductsToday = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Pending transactions
      const pendingTx = pendingTransactionsRes.data || [];
      const pendingTransactionsAmount = pendingTx.reduce((sum, t) => sum + Number(t.amount), 0);

      // Active session with user name
      let activeCashSession = null;
      if (activeSessionRes.data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', activeSessionRes.data.user_id)
          .maybeSingle();

        activeCashSession = {
          id: activeSessionRes.data.id,
          initialAmount: Number(activeSessionRes.data.initial_amount),
          openedAt: activeSessionRes.data.opened_at,
          userName: profile?.full_name
        };
      }

      setStats({
        salesToday,
        salesYesterday,
        salesWeek,
        salesMonth,
        transactionsToday,
        averageTicketToday,
        lowStockProducts: lowStockRes.data || [],
        topProductsToday,
        activeCashSession,
        pendingTransactions: pendingTx.length,
        pendingTransactionsAmount,
        growthPercentage
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, [lowStockThreshold]);

  useEffect(() => {
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, refresh: fetchStats };
}
