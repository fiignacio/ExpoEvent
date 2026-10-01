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

      if (!cleanCode) {
        toast.error("Ingresa un código de acceso");
        return { error: new Error("Código vacío") };
      }

      // 1. Código Admin por defecto
      if (cleanCode === "ADMIN") {
        const mockUser: any = {
          id: "admin-user-001",
          email: "admin@expoventas.cl",
          aud: "authenticated",
          role: "authenticated",
        };
        const mockProfile: Profile = {
          id: "profile-admin",
          user_id: mockUser.id,
          full_name: "Administrador Evento",
          email: mockUser.email,
          username: "admin_evento"
        };
        setUser(mockUser);
        setProfile(mockProfile);
        setRole("admin");
        localStorage.setItem("expoventas_auth_user", JSON.stringify(mockUser));
        localStorage.setItem("expoventas_auth_profile", JSON.stringify(mockProfile));
        toast.success("Bienvenido, Administrador Evento");
        navigate("/");
        return { error: null };
      }

      // 2. Código Cajero por defecto
      if (cleanCode === "1234") {
        const mockUser: any = {
          id: "cajero-user-001",
          email: "cajero@expoventas.cl",
          aud: "authenticated",
          role: "authenticated",
        };
        const mockProfile: Profile = {
          id: "profile-cajero",
          user_id: mockUser.id,
          full_name: "Cajero Evento",
          email: mockUser.email,
          username: "cajero_evento"
        };
        setUser(mockUser);
        setProfile(mockProfile);
        setRole("cashier");
        localStorage.setItem("expoventas_auth_user", JSON.stringify(mockUser));
        localStorage.setItem("expoventas_auth_profile", JSON.stringify(mockProfile));
        toast.success("Bienvenido, Cajero Evento");
        navigate("/");
        return { error: null };
      }

      // 3. Consultar código de acceso personalizado en Supabase
      try {
        const { data: dbCode, error: dbErr } = await supabase
          .from("access_codes")
          .select("*")
          .eq("code", cleanCode)
          .maybeSingle();

        if (!dbErr && dbCode) {
          const userRole = dbCode.role === "admin" ? "admin" : "cashier";
          const mockUser: any = {
            id: `user-${dbCode.id}`,
            email: `${userRole}@expoventas.cl`,
            aud: "authenticated",
            role: "authenticated",
          };
          const mockProfile: Profile = {
            id: `profile-${dbCode.id}`,
            user_id: mockUser.id,
            full_name: userRole === "admin" ? "Administrador Evento" : "Cajero Evento",
            email: mockUser.email,
            username: `${userRole}_evento`
          };
          setUser(mockUser);
          setProfile(mockProfile);
          setRole(userRole);
          localStorage.setItem("expoventas_auth_user", JSON.stringify(mockUser));
          localStorage.setItem("expoventas_auth_profile", JSON.stringify(mockProfile));
          toast.success(`Bienvenido, ${mockProfile.full_name}`);
          navigate("/");
          return { error: null };
        }
      } catch (e) {
        console.warn("Error consultando access_codes:", e);
      }

      // 4. Si no coincide con ningún código válido, RECHAZAR
      toast.error("Código de acceso incorrecto (Ej: 1234 o ADMIN)");
      return { error: new Error("Código de acceso inválido") };
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
