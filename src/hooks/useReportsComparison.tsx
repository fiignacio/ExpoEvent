import { useState, useEffect } from "react";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { getAllCombinedSales, parseSafeDate } from "@/hooks/useReports";

interface PeriodComparison {
  currentPeriod: {
    sales: number;
    transactions: number;
    averageTicket: number;
    productsSold: number;
  };
  previousPeriod: {
    sales: number;
    transactions: number;
    averageTicket: number;
    productsSold: number;
  };
  changes: {
    sales: number;
    transactions: number;
    averageTicket: number;
    productsSold: number;
  };
}

interface DailyComparisonData {
  date: string;
  name: string;
  currentPeriod: number;
  previousPeriod: number;
}

export function useReportsComparison(days: number = 7, endDateOverride?: Date) {
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [dailyComparison, setDailyComparison] = useState<DailyComparisonData[]>([]);
  const [paymentMethodsComparison, setPaymentMethodsComparison] = useState<{
    current: Record<string, number>;
    previous: Record<string, number>;
  }>({ current: {}, previous: {} });
  const [loading, setLoading] = useState(true);

  const endKey = endDateOverride?.getTime() ?? 0;

  useEffect(() => {
    fetchComparisonData();
  }, [days, endKey]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      const baseEnd = endDateOverride ?? new Date();
      
      // Current period
      const currentEndDate = endOfDay(baseEnd);
      const currentStartDate = startOfDay(subDays(baseEnd, days - 1));
      
      // Previous period (same duration, before current period)
      const previousEndDate = endOfDay(subDays(currentStartDate, 1));
      const previousStartDate = startOfDay(subDays(previousEndDate, days - 1));

      const currentStartTime = currentStartDate.getTime();
      const currentEndTime = currentEndDate.getTime();
      const previousStartTime = previousStartDate.getTime();
      const previousEndTime = previousEndDate.getTime();

      // Obtener todas las ventas combinadas (local + Supabase) para evitar discrepancias
      const allSales = await getAllCombinedSales();

      const currentSales = allSales.filter(s => {
        const ts = parseSafeDate(s.timestamp || s.created_at);
        return ts >= currentStartTime && ts <= currentEndTime;
      });

      const previousSales = allSales.filter(s => {
        const ts = parseSafeDate(s.timestamp || s.created_at);
        return ts >= previousStartTime && ts <= previousEndTime;
      });

      // Calculate current period metrics
      const currentMetrics = calculateMetrics(currentSales);
      const previousMetrics = calculateMetrics(previousSales);

      // Calculate percentage changes
      const changes = {
        sales: calculatePercentageChange(previousMetrics.sales, currentMetrics.sales),
        transactions: calculatePercentageChange(previousMetrics.transactions, currentMetrics.transactions),
        averageTicket: calculatePercentageChange(previousMetrics.averageTicket, currentMetrics.averageTicket),
        productsSold: calculatePercentageChange(previousMetrics.productsSold, currentMetrics.productsSold),
      };

      setComparison({
        currentPeriod: currentMetrics,
        previousPeriod: previousMetrics,
        changes,
      });

      // Calculate daily comparison
      const dailyData = calculateDailyComparison(currentSales, previousSales, days);
      setDailyComparison(dailyData);

      // Calculate payment methods comparison
      const currentPayments = calculatePaymentMethods(currentSales);
      const previousPayments = calculatePaymentMethods(previousSales);
      setPaymentMethodsComparison({ current: currentPayments, previous: previousPayments });

    } catch (error) {
      console.error("Error fetching comparison data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (sales: any[]) => {
    let totalSales = 0;
    let totalProducts = 0;

    sales.forEach((sale) => {
      totalSales += Number(sale.total || 0);
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          totalProducts += Number(item.quantity || 0);
        });
      }
    });

    return {
      sales: totalSales,
      transactions: sales.length,
      averageTicket: sales.length > 0 ? totalSales / sales.length : 0,
      productsSold: totalProducts,
    };
  };

  const calculatePercentageChange = (previous: number, current: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const calculateDailyComparison = (currentSales: any[], previousSales: any[], daysCount: number): DailyComparisonData[] => {
    const result: DailyComparisonData[] = [];
    const baseEnd = endDateOverride ?? new Date();
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const currentDate = subDays(baseEnd, i);
      const previousDate = subDays(currentDate, daysCount);
      
      const currentStart = startOfDay(currentDate).getTime();
      const currentEnd = endOfDay(currentDate).getTime();
      const prevStart = startOfDay(previousDate).getTime();
      const prevEnd = endOfDay(previousDate).getTime();

      const currentDateStr = format(currentDate, 'yyyy-MM-dd');
      
      const currentDaySales = currentSales
        .filter(s => {
          const ts = parseSafeDate(s.timestamp || s.created_at);
          return ts >= currentStart && ts <= currentEnd;
        })
        .reduce((sum, s) => sum + Number(s.total || 0), 0);
      
      const previousDaySales = previousSales
        .filter(s => {
          const ts = parseSafeDate(s.timestamp || s.created_at);
          return ts >= prevStart && ts <= prevEnd;
        })
        .reduce((sum, s) => sum + Number(s.total || 0), 0);
      
      const dayName = currentDate.toLocaleDateString('es-CL', { weekday: 'short' });

      result.push({
        date: currentDateStr,
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        currentPeriod: Math.round(currentDaySales),
        previousPeriod: Math.round(previousDaySales),
      });
    }
    
    return result;
  };

  const calculatePaymentMethods = (sales: any[]): Record<string, number> => {
    const methods: Record<string, number> = {
      efectivo: 0,
      debito: 0,
      credito: 0,
      transferencia: 0,
      mixto: 0,
    };

    sales.forEach((sale) => {
      const rawMethod = (sale.payment_method || sale.paymentMethod || 'efectivo').toString().toLowerCase();
      const method = rawMethod in methods ? rawMethod : 'efectivo';
      methods[method] += Number(sale.total || 0);
    });

    return methods;
  };

  return {
    comparison,
    dailyComparison,
    paymentMethodsComparison,
    loading,
    refresh: fetchComparisonData,
  };
}
