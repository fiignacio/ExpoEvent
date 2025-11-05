import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Bienvenido, {profile?.full_name || "Usuario"}</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Sistema de Punto de Venta</p>
      </div>

      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center space-y-3 md:space-y-4">
            <p className="text-base md:text-lg text-muted-foreground">
              Selecciona una opción del menú para comenzar
            </p>
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-4 md:mt-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/pos"}>
                <CardContent className="pt-4 md:pt-6 text-center">
                  <h3 className="font-semibold text-base md:text-lg">Punto de Venta</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">Realizar ventas</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/inventory"}>
                <CardContent className="pt-4 md:pt-6 text-center">
                  <h3 className="font-semibold text-base md:text-lg">Inventario</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">Gestionar productos</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/settings"}>
                <CardContent className="pt-4 md:pt-6 text-center">
                  <h3 className="font-semibold text-base md:text-lg">Configuración</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">Ajustes del sistema</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
