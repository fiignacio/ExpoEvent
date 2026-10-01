import { useState, useEffect, useCallback } from "react";
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

const LOCAL_CASH_SESSIONS_KEY = "expoventas_cash_sessions";

export function useCashRegister() {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);

  const getLocalSessions = (): CashSession[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CASH_SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveLocalSessions = (sessions: CashSession[]) => {
    try {
      localStorage.setItem(LOCAL_CASH_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Error saving local cash sessions:", e);
    }
  };

  const checkActiveSession = useCallback(async () => {
    const userId = user?.id || "event-user-001";
    
    // 1. Intentar cargar desde Supabase
    try {
      const { data, error } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const sessionObj: CashSession = {
          id: data.id,
          user_id: data.user_id || userId,
          opened_at: data.opened_at,
          closed_at: data.closed_at,
          initial_amount: Number(data.initial_amount || 0),
          final_amount: data.final_amount ? Number(data.final_amount) : null,
          status: data.status as "open" | "closed"
        };
        setCurrentSession(sessionObj);

        // Sincronizar en localStorage
        const local = getLocalSessions();
        const updated = [sessionObj, ...local.filter(s => s.id !== sessionObj.id)];
        saveLocalSessions(updated);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("No se pudo verificar sesión en la nube, usando almacenamiento local:", e);
    }

    // 2. Fallback local
    const localSessions = getLocalSessions();
    const activeLocal = localSessions.find(s => s.status === 'open');
    if (activeLocal) {
      setCurrentSession(activeLocal);
    } else {
      setCurrentSession(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  const openSession = async (initialAmount: number) => {
    const userId = user?.id || "event-user-001";
    const sessionId = crypto.randomUUID();
    const newSession: CashSession = {
      id: sessionId,
      user_id: userId,
      opened_at: new Date().toISOString(),
      closed_at: null,
      initial_amount: initialAmount,
      final_amount: null,
      status: "open"
    };

    // Guardar localmente
    setCurrentSession(newSession);
    const local = getLocalSessions();
    const updated = [newSession, ...local.filter(s => s.id !== newSession.id)];
    saveLocalSessions(updated);

    // Intentar guardar en Supabase
    try {
      await supabase.from('cash_register_sessions').insert([{
        id: sessionId,
        user_id: userId,
        initial_amount: initialAmount,
        status: 'open',
        opened_at: newSession.opened_at
      }]);
    } catch (e) {
      console.error("Error al guardar sesión en Supabase:", e);
    }

    toast.success(`Caja abierta con monto inicial: $${initialAmount.toLocaleString('es-CL')}`);
    return newSession;
  };

  const closeSession = async (finalAmount: number) => {
    if (!currentSession) {
      toast.error("No hay sesión activa");
      return false;
    }

    const closedSession: CashSession = {
      ...currentSession,
      final_amount: finalAmount,
      closed_at: new Date().toISOString(),
      status: "closed"
    };

    // Actualizar localmente
    setCurrentSession(null);
    const local = getLocalSessions();
    const updated = local.map(s => s.id === currentSession.id ? closedSession : s);
    saveLocalSessions(updated);

    // Intentar actualizar en Supabase
    try {
      await supabase
        .from('cash_register_sessions')
        .update({
          final_amount: finalAmount,
          closed_at: closedSession.closed_at,
          status: 'closed'
        })
        .eq('id', currentSession.id);
    } catch (e) {
      console.error("Error al cerrar sesión en Supabase:", e);
    }

    toast.success("Caja cerrada exitosamente");
    return true;
  };

  return {
    currentSession,
    loading,
    openSession,
    closeSession,
    checkActiveSession
  };
}