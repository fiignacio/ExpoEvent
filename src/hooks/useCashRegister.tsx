import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

interface CashSession {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  initial_amount: number;
  final_amount: number | null;
  status: "open" | "closed";
}

export function useCashRegister() {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkActiveSession();
    }
  }, [user]);

  const checkActiveSession = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentSession(data as CashSession);
    } catch (error: any) {
      console.error("Error checking session:", error);
    } finally {
      setLoading(false);
    }
  };

  const openSession = async (initialAmount: number) => {
    if (!user) {
      toast.error("Debes iniciar sesión para abrir caja");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('cash_register_sessions')
        .insert([{
          user_id: user.id,
          initial_amount: initialAmount,
          status: 'open'
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data as CashSession);
      toast.success("Caja abierta exitosamente");
      return data;
    } catch (error: any) {
      toast.error("Error al abrir caja: " + error.message);
      return null;
    }
  };

  const closeSession = async (finalAmount: number) => {
    if (!currentSession) {
      toast.error("No hay sesión activa");
      return false;
    }

    try {
      const { error } = await supabase
        .from('cash_register_sessions')
        .update({
          final_amount: finalAmount,
          closed_at: new Date().toISOString(),
          status: 'closed'
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(null);
      toast.success("Caja cerrada exitosamente");
      return true;
    } catch (error: any) {
      toast.error("Error al cerrar caja: " + error.message);
      return false;
    }
  };

  return {
    currentSession,
    loading,
    openSession,
    closeSession,
    checkActiveSession
  };
}