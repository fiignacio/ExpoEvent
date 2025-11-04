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
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (username: string, password: string, fullName: string) => Promise<{ error: any }>;
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

  const signIn = async (username: string, password: string) => {
    try {
      // Get email from username
      const { data: emailData, error: emailError } = await supabase
        .rpc('get_email_by_username', { _username: username });

      if (emailError || !emailData) {
        toast.error("Usuario no encontrado");
        return { error: new Error("Usuario no encontrado") };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailData,
        password,
      });

      if (error) {
        toast.error("Error al iniciar sesión: " + error.message);
      } else {
        toast.success("Sesión iniciada correctamente");
        navigate("/");
      }

      return { error };
    } catch (error: any) {
      toast.error("Error al iniciar sesión");
      return { error };
    }
  };

  const signUp = async (username: string, password: string, fullName: string) => {
    try {
      // Check if username already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (existingProfile) {
        toast.error("El nombre de usuario ya está en uso");
        return { error: new Error("El nombre de usuario ya está en uso") };
      }

      // Generate a unique email for Supabase auth
      const email = `${username}@sistema.local`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            username: username,
          },
        },
      });

      if (error) {
        toast.error("Error al registrarse: " + error.message);
      } else {
        // Update profile with username
        toast.success("Cuenta creada correctamente");
        navigate("/");
      }

      return { error };
    } catch (error: any) {
      toast.error("Error al registrarse");
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
        signIn,
        signUp,
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
