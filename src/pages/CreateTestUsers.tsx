import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, UserCog } from "lucide-react";

export default function CreateTestUsers() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createTestUsers = async () => {
    setLoading(true);
    
    try {
      // Create admin user
      const { error: adminError } = await supabase.auth.signUp({
        email: 'admin@sistema.local',
        password: 'admin123',
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: 'Administrador',
            username: 'admin',
          },
        },
      });

      if (adminError && !adminError.message.includes('already registered')) {
        throw new Error(`Error creando admin: ${adminError.message}`);
      }

      // Wait a bit before creating the next user
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create cashier user
      const { error: cashierError } = await supabase.auth.signUp({
        email: 'cajero@sistema.local',
        password: 'cajero123',
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: 'Cajero',
            username: 'cajero',
          },
        },
      });

      if (cashierError && !cashierError.message.includes('already registered')) {
        throw new Error(`Error creando cajero: ${cashierError.message}`);
      }

      // Update admin role
      const { data: users } = await supabase
        .from('profiles')
        .select('user_id, username')
        .eq('username', 'admin')
        .single();

      if (users) {
        await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', users.user_id);
      }

      toast.success("Usuarios de prueba creados correctamente");
      setTimeout(() => {
        navigate('/auth');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Error creando usuarios");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Configuración Inicial</CardTitle>
          <CardDescription>Crea los usuarios de prueba del sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Usuario Administrador</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Usuario: <span className="font-mono bg-background px-2 py-1 rounded">admin</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Contraseña: <span className="font-mono bg-background px-2 py-1 rounded">admin123</span>
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Usuario Cajero</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Usuario: <span className="font-mono bg-background px-2 py-1 rounded">cajero</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Contraseña: <span className="font-mono bg-background px-2 py-1 rounded">cajero123</span>
              </p>
            </div>
          </div>

          <Button 
            onClick={createTestUsers} 
            className="w-full" 
            disabled={loading}
            size="lg"
          >
            {loading ? "Creando usuarios..." : "Crear Usuarios de Prueba"}
          </Button>

          <Button 
            variant="outline" 
            onClick={() => navigate('/auth')} 
            className="w-full"
          >
            Ir a Iniciar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}