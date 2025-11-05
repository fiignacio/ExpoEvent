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
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
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
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleError) throw roleError;
      setRole(roleData?.role ?? null);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
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

      // Si el usuario ya existe, iniciar sesión directamente
      if (user_id) {
        // Generar contraseña basada en el código
        const password = `code_${code}_pass`;
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          toast.error("Error al iniciar sesión");
          return { error: signInError };
        }

        toast.success(`Bienvenido, ${user_name}`);
        navigate("/");
        return { error: null };
      }

      // Si el usuario no existe, crearlo
      const password = `code_${code}_pass`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: user_name,
            username: code,
          },
        },
      });

      if (signUpError) {
        toast.error("Error al crear sesión: " + signUpError.message);
        return { error: signUpError };
      }

      // Si el usuario fue creado, asignar el rol correcto desde el código
      if (signUpData.user) {
        // Esperar un momento para que se cree el perfil y el rol por defecto
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Eliminar el rol por defecto y crear el rol correcto
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', signUpData.user.id);

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: signUpData.user.id, role });

        if (roleError) {
          console.error("Error asignando rol:", roleError);
        }
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
