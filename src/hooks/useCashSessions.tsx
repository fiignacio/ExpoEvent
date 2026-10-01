import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CashSession {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  initial_amount: number;
  final_amount: number | null;
  status: "open" | "closed";
  profiles?: {
    full_name: string;
  };
}

interface Sale {
  id: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  items: any;
  created_at: string;
}

const LOCAL_CASH_SESSIONS_KEY = "expoventas_cash_sessions";
const OFFLINE_SALES_KEY = "offline_sales";

export function useCashSessions() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  const getLocalSessions = (): CashSession[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CASH_SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const fetchSessions = async () => {
    const local = getLocalSessions();
    try {
      const { data: sessionsData, error } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .order('opened_at', { ascending: false });

      if (!error && sessionsData && sessionsData.length > 0) {
        const mappedRemote: CashSession[] = sessionsData.map((s: any) => ({
          id: s.id,
          user_id: s.user_id || 'event-user-001',
          opened_at: s.opened_at,
          closed_at: s.closed_at,
          initial_amount: Number(s.initial_amount || 0),
          final_amount: s.final_amount ? Number(s.final_amount) : null,
          status: s.status as "open" | "closed",
          profiles: { full_name: "Cajero Evento" }
        }));

        // Combinar remotas y locales por ID
        const sessionMap = new Map<string, CashSession>();
        local.forEach(s => sessionMap.set(s.id, { ...s, profiles: { full_name: "Cajero Evento" } }));
        mappedRemote.forEach(s => sessionMap.set(s.id, s));

        const merged = Array.from(sessionMap.values()).sort(
          (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
        );

        setSessions(merged);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("No se pudieron cargar sesiones de la nube, usando almacenamiento local:", e);
    }

    // Fallback local con profile mock
    const mappedLocal = local.map(s => ({ ...s, profiles: { full_name: "Cajero Evento" } }));
    setSessions(mappedLocal);
    setLoading(false);
  };

  const fetchSessionSales = async (sessionId: string): Promise<Sale[]> => {
    // 1. Obtener ventas locales (offline_sales)
    let localSales: Sale[] = [];
    try {
      const stored = localStorage.getItem(OFFLINE_SALES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        localSales = parsed.map((s: any) => ({
          id: s.id,
          payment_method: s.paymentMethod || s.payment_method || 'efectivo',
          total: Number(s.total || 0),
          subtotal: Number(s.subtotal || 0),
          tax: Number(s.tax || 0),
          items: s.items || [],
          created_at: new Date(s.timestamp || s.created_at || Date.now()).toISOString()
        }));
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from('offline_sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const remoteSales: Sale[] = data.map((s: any) => ({
          id: s.id,
          payment_method: s.payment_method || 'efectivo',
          total: Number(s.total || 0),
          subtotal: Number(s.subtotal || 0),
          tax: Number(s.tax || 0),
          items: s.items || [],
          created_at: s.created_at
        }));

        const salesMap = new Map<string, Sale>();
        localSales.forEach(s => salesMap.set(s.id, s));
        remoteSales.forEach(s => salesMap.set(s.id, s));

        return Array.from(salesMap.values());
      }
    } catch (e) {
      console.warn("Error fetching remote session sales, using local:", e);
    }

    return localSales;
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    fetchSessions,
    fetchSessionSales
  };
}

