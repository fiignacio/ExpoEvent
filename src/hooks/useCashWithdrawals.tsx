import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CashWithdrawal {
  id: string;
  session_id: string;
  amount: number;
  reason: string;
  created_by: string;
  created_at: string;
  user?: {
    full_name: string;
  };
}

export function useCashWithdrawals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const recordWithdrawal = useCallback(async (
    sessionId: string,
    amount: number,
    reason: string
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error("No estás autenticado");
      return false;
    }

    if (amount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return false;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('cash_withdrawals')
        .insert({
          session_id: sessionId,
          amount,
          reason,
          created_by: user.id
        });

      if (error) throw error;

      toast.success(`Retiro de $${amount.toLocaleString('es-CL')} registrado`);
      return true;
    } catch (error: any) {
      toast.error("Error al registrar retiro: " + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchWithdrawals = useCallback(async (
    sessionId: string
  ): Promise<CashWithdrawal[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cash_withdrawals')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(w => w.created_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        return data.map(w => ({
          ...w,
          user: { full_name: profileMap.get(w.created_by) || 'Usuario' }
        }));
      }

      return [];
    } catch (error: any) {
      console.error("Error fetching withdrawals:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getTotalWithdrawals = useCallback(async (
    sessionId: string
  ): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('cash_withdrawals')
        .select('amount')
        .eq('session_id', sessionId);

      if (error) throw error;
      return (data || []).reduce((sum, w) => sum + Number(w.amount), 0);
    } catch (error) {
      console.error("Error getting total withdrawals:", error);
      return 0;
    }
  }, []);

  return {
    recordWithdrawal,
    fetchWithdrawals,
    getTotalWithdrawals,
    loading
  };
}
