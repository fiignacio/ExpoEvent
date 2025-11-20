import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DebtSummary {
  customerId: string;
  customerName: string;
  customerType: "customer" | "supplier";
  totalDebt: number;
  pendingTransactions: number;
}

export interface SalesReport {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalQuantity: number;
  transactionCount: number;
}

export interface TrendData {
  date: string;
  receivables: number; // por cobrar
  payables: number; // por pagar
}

export const useCustomerDashboard = () => {
  const [receivables, setReceivables] = useState<DebtSummary[]>([]);
  const [payables, setPayables] = useState<DebtSummary[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [salesByCustomer, setSalesByCustomer] = useState<SalesReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchDebtSummary(),
        fetchTrends(),
        fetchSalesByCustomer(),
      ]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDebtSummary = async () => {
    try {
      // Obtener todas las transacciones pendientes
      const { data: transactions, error } = await supabase
        .from("customer_transactions")
        .select(`
          *,
          customer:customers(id, name, type)
        `)
        .eq("status", "pending");

      if (error) throw error;

      // Agrupar por cliente y calcular totales
      const debtMap = new Map<string, DebtSummary>();

      transactions?.forEach((transaction: any) => {
        const customerId = transaction.customer_id;
        const customer = transaction.customer;
        
        if (!debtMap.has(customerId)) {
          debtMap.set(customerId, {
            customerId,
            customerName: customer.name,
            customerType: customer.type,
            totalDebt: 0,
            pendingTransactions: 0,
          });
        }

        const summary = debtMap.get(customerId)!;
        
        if (transaction.type === "debt") {
          summary.totalDebt += Number(transaction.amount);
        } else if (transaction.type === "payment") {
          summary.totalDebt -= Number(transaction.amount);
        }
        
        summary.pendingTransactions++;
      });

      // Separar por tipo
      const receivablesList: DebtSummary[] = [];
      const payablesList: DebtSummary[] = [];

      debtMap.forEach((summary) => {
        if (summary.totalDebt > 0) {
          if (summary.customerType === "customer") {
            receivablesList.push(summary);
          } else {
            payablesList.push(summary);
          }
        }
      });

      setReceivables(receivablesList.sort((a, b) => b.totalDebt - a.totalDebt));
      setPayables(payablesList.sort((a, b) => b.totalDebt - a.totalDebt));
    } catch (error: any) {
      console.error("Error fetching debt summary:", error);
      throw error;
    }
  };

  const fetchTrends = async () => {
    try {
      // Obtener transacciones de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions, error } = await supabase
        .from("customer_transactions")
        .select(`
          *,
          customer:customers(type)
        `)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Agrupar por día
      const trendMap = new Map<string, TrendData>();

      transactions?.forEach((transaction: any) => {
        const date = new Date(transaction.created_at).toLocaleDateString();
        
        if (!trendMap.has(date)) {
          trendMap.set(date, {
            date,
            receivables: 0,
            payables: 0,
          });
        }

        const trend = trendMap.get(date)!;
        const amount = Number(transaction.amount);

        if (transaction.type === "debt") {
          if (transaction.customer.type === "customer") {
            trend.receivables += amount;
          } else {
            trend.payables += amount;
          }
        }
      });

      const trendsArray = Array.from(trendMap.values()).slice(-14); // Últimos 14 días
      setTrends(trendsArray);
    } catch (error: any) {
      console.error("Error fetching trends:", error);
      throw error;
    }
  };

  const fetchSalesByCustomer = async () => {
    try {
      // Obtener todas las transacciones de tipo deuda (ventas)
      const { data: transactions, error } = await supabase
        .from("customer_transactions")
        .select(`
          *,
          customer:customers(id, name, type)
        `)
        .eq("type", "debt");

      if (error) throw error;

      // Agrupar por cliente
      const salesMap = new Map<string, SalesReport>();

      transactions?.forEach((transaction: any) => {
        const customerId = transaction.customer_id;
        const customer = transaction.customer;

        if (!salesMap.has(customerId)) {
          salesMap.set(customerId, {
            customerId,
            customerName: customer.name,
            totalSales: 0,
            totalQuantity: 0,
            transactionCount: 0,
          });
        }

        const report = salesMap.get(customerId)!;
        report.totalSales += Number(transaction.amount);
        report.transactionCount++;
      });

      const salesArray = Array.from(salesMap.values()).sort((a, b) => b.totalSales - a.totalSales);
      setSalesByCustomer(salesArray);
    } catch (error: any) {
      console.error("Error fetching sales by customer:", error);
      throw error;
    }
  };

  const getTotalReceivables = () => {
    return receivables.reduce((sum, item) => sum + item.totalDebt, 0);
  };

  const getTotalPayables = () => {
    return payables.reduce((sum, item) => sum + item.totalDebt, 0);
  };

  return {
    receivables,
    payables,
    trends,
    salesByCustomer,
    loading,
    getTotalReceivables,
    getTotalPayables,
    refresh: fetchDashboardData,
  };
};
