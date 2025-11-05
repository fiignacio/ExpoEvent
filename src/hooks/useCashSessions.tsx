import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function useCashSessions() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const { data: sessionsData, error } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .order('opened_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each session
      const userIds = [...new Set(sessionsData?.map(s => s.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Merge profiles with sessions
      const sessionsWithProfiles = sessionsData?.map(session => ({
        ...session,
        profiles: profilesData?.find(p => p.user_id === session.user_id)
      })) || [];

      setSessions(sessionsWithProfiles as CashSession[]);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast.error("Error al cargar sesiones: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionSales = async (sessionId: string): Promise<Sale[]> => {
    try {
      const { data, error } = await supabase
        .from('offline_sales')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Error fetching session sales:", error);
      toast.error("Error al cargar ventas: " + error.message);
      return [];
    }
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
