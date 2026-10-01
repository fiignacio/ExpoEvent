import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  username: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "cashier";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: "admin" | "cashier" | null;
  loading: boolean;
  signInWithCode: (code: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<"admin" | "cashier" | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("expoventas_auth_user");
      const storedProfile = localStorage.getItem("expoventas_auth_profile");

      if (storedUser && storedProfile) {
        const parsedUser = JSON.parse(storedUser);
        const parsedProfile = JSON.parse(storedProfile);
        setUser(parsedUser);
        setProfile(parsedProfile);
        setRole(parsedProfile.full_name?.toLowerCase().includes("admin") ? "admin" : "cashier");
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Error reading stored auth state:", e);
    }

    setLoading(false);
  }, []);

  const signInWithCode = async (code: string) => {
    try {
      const cleanCode = code.trim().toUpperCase();
      const isAdmin = cleanCode === "ADMIN";
      const isCashier = cleanCode === "1234" || cleanCode.length > 0;

      if (!cleanCode) {
        toast.error("Ingresa un código de acceso");
        return { error: new Error("Código vacío") };
      }

      const mockUser: any = {
        id: isAdmin ? "admin-user-001" : "cajero-user-001",
        email: isAdmin ? "admin@expoventas.cl" : "cajero@expoventas.cl",
        aud: "authenticated",
        role: "authenticated",
      };

      const mockProfile: Profile = {
        id: isAdmin ? "profile-admin" : "profile-cajero",
        user_id: mockUser.id,
        full_name: isAdmin ? "Administrador Evento" : "Cajero Evento",
        email: mockUser.email,
        username: isAdmin ? "admin_evento" : "cajero_evento"
      };

      setUser(mockUser);
      setProfile(mockProfile);
      setRole(isAdmin ? "admin" : "cashier");

      localStorage.setItem("expoventas_auth_user", JSON.stringify(mockUser));
      localStorage.setItem("expoventas_auth_profile", JSON.stringify(mockProfile));

      toast.success(`Bienvenido, ${mockProfile.full_name}`);
      navigate("/");
      return { error: null };
    } catch (error: any) {
      console.error("SignInWithCode error:", error);
      toast.error("Error al iniciar sesión");
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {}
    localStorage.removeItem("expoventas_auth_user");
    localStorage.removeItem("expoventas_auth_profile");
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    toast.info("Sesión cerrada");
    navigate("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signInWithCode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
