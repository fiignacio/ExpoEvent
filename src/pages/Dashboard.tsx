import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bienvenido, {profile?.full_name || "Usuario"}</h1>
        <p className="text-muted-foreground mt-1">Sistema de Punto de Venta</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              Selecciona una opción del menú para comenzar
            </p>
            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/pos"}>
                <CardContent className="pt-6 text-center">
                  <h3 className="font-semibold text-lg">Punto de Venta</h3>
                  <p className="text-sm text-muted-foreground mt-2">Realizar ventas</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/inventory"}>
                <CardContent className="pt-6 text-center">
                  <h3 className="font-semibold text-lg">Inventario</h3>
                  <p className="text-sm text-muted-foreground mt-2">Gestionar productos</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/settings"}>
                <CardContent className="pt-6 text-center">
                  <h3 className="font-semibold text-lg">Configuración</h3>
                  <p className="text-sm text-muted-foreground mt-2">Ajustes del sistema</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
