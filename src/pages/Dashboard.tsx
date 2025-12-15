import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { ShoppingCart, Package, Settings, BarChart3, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { 
      title: "Punto de Venta", 
      description: "Realizar ventas", 
      icon: ShoppingCart, 
      href: "/pos",
      color: "bg-gradient-primary"
    },
    { 
      title: "Inventario", 
      description: "Gestionar productos", 
      icon: Package, 
      href: "/inventory",
      color: "bg-gradient-to-br from-emerald-500 to-emerald-600"
    },
    { 
      title: "Reportes", 
      description: "Ver estadísticas", 
      icon: BarChart3, 
      href: "/reports",
      color: "bg-gradient-to-br from-amber-500 to-orange-600"
    },
    { 
      title: "Clientes", 
      description: "Gestionar clientes", 
      icon: Users, 
      href: "/customers",
      color: "bg-gradient-to-br from-violet-500 to-purple-600"
    },
    { 
      title: "Configuración", 
      description: "Ajustes del sistema", 
      icon: Settings, 
      href: "/settings",
      color: "bg-gradient-to-br from-slate-500 to-slate-600"
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-6 px-2 sm:px-4 md:px-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Bienvenido, {profile?.full_name || "Usuario"}
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base">
          Sistema de Punto de Venta
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {menuItems.map((item) => (
          <Card 
            key={item.href}
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]" 
            onClick={() => navigate(item.href)}
          >
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl ${item.color} flex items-center justify-center shadow-md`}>
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base md:text-lg leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role indicator */}
      <Card className="mt-4">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Rol actual: <span className="font-semibold capitalize">{role || 'Usuario'}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
