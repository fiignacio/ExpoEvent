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
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session recovery error:", error);
        // Clear corrupted session data
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
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

      // Generar contraseña consistente basada en el email
      const emailIdentifier = email.split('@')[0].replace('user_', '');
      const password = `pos_secure_${emailIdentifier}`;

      console.log("Attempting login for:", email);

      // Limpiar estado antes de cualquier operación
      setProfile(null);
      setRole(null);

      // Intentar iniciar sesión primero
      const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData.user) {
        // Login exitoso
        console.log("Login successful");
        await supabase.rpc('sync_role_on_login', { _email: email, _role: role });
        toast.success(`Bienvenido, ${user_name}`);
        navigate("/");
        return { error: null };
      }

      console.log("Login failed, checking if user exists...");

      // Si falló el login, verificar si el usuario existe
      // Intentar resetear la contraseña usando el edge function
      try {
        const response = await supabase.functions.invoke('reset-user-password', {
          body: { email, newPassword: password }
        });

        if (response.error) {
          console.log("Reset password response error:", response.error);
        }

        if (response.data?.success) {
          console.log("Password reset successful, trying login again");
          // Intentar login de nuevo con la nueva contraseña
          const { error: retryError, data: retryData } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!retryError && retryData.user) {
            await supabase.rpc('sync_role_on_login', { _email: email, _role: role });
            toast.success(`Bienvenido, ${user_name}`);
            navigate("/");
            return { error: null };
          }
        } else if (response.data?.code === 'USER_NOT_FOUND') {
          console.log("User not found, creating new user");
        }
      } catch (resetError) {
        console.log("Reset password call failed:", resetError);
      }

      // Si el usuario no existe, crear uno nuevo
      console.log("Creating new user with email:", email);
      
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
          // El usuario existe pero no pudimos resetear la contraseña
          // Intentar eliminar y recrear
          console.log("User exists but password reset failed");
          toast.error("Error de credenciales. Contacta al administrador para resetear tu cuenta.");
          return { error: signUpError };
        }
        toast.error("Error al crear sesión: " + signUpError.message);
        return { error: signUpError };
      }

      // Si el usuario fue creado, asignar el rol correcto
      if (signUpData.user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await supabase.rpc('sync_role_on_login', { _email: email, _role: role });
        
        toast.success(`Bienvenido, ${user_name}`);
        navigate("/");
      }

      return { error: null };
    } catch (error: any) {
      console.error("SignInWithCode error:", error);
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
