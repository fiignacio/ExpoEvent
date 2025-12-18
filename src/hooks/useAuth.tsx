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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Limpiar estado antes de cargar nuevos datos
          setProfile(null);
          setRole(null);
          
          // Usar setTimeout para evitar deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      console.log("Fetching user data for:", userId);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      
      console.log("Profile data:", profileData);
      setProfile(profileData);

      // Fetch role - forzar recarga desde la base de datos
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (roleError) throw roleError;
      
      console.log("Role data:", roleData);
      setRole(roleData?.role ?? null);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      setProfile(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithCode = async (code: string) => {
    try {
      // Verificar el código y obtener datos del usuario
      const { data: codeData, error: codeError } = await supabase
        .rpc('authenticate_with_code', { _code: code });

      if (codeError || !codeData || codeData.length === 0) {
        toast.error("Código inválido o inactivo");
        return { error: new Error("Código inválido") };
      }

      const { user_id, role, user_name, email } = codeData[0];

      // Extraer identificador del email (formato: user_UUID@pos.internal)
      const emailIdentifier = email.split('@')[0].replace('user_', '');
      const password = `pass_${emailIdentifier}_secure`;

      // Limpiar estado antes de cualquier operación
      setProfile(null);
      setRole(null);

      // Intentar iniciar sesión primero
      const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData.user) {
        // Login exitoso - sincronizar rol
        await supabase.rpc('sync_role_on_login', { _email: email, _role: role });
        toast.success(`Bienvenido, ${user_name}`);
        navigate("/");
        return { error: null };
      }

      // Si falló el login, intentar crear el usuario
      console.log("Creando nuevo usuario con credenciales seguras...");
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: user_name,
            username: emailIdentifier,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast.error("Error de autenticación. Contacta al administrador.");
          return { error: signUpError };
        }
        toast.error("Error al crear sesión: " + signUpError.message);
        return { error: signUpError };
      }

      // Si el usuario fue creado, asignar el rol correcto usando función con SECURITY DEFINER
      if (signUpData.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Usar sync_role_on_login que tiene SECURITY DEFINER y puede saltar RLS
        await supabase.rpc('sync_role_on_login', { _email: email, _role: role });
      }

      toast.success(`Bienvenido, ${user_name}`);
      navigate("/");
      return { error: null };
    } catch (error: any) {
      toast.error("Error al iniciar sesión");
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
