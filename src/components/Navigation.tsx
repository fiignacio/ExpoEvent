import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  Shield,
  LogOut,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, adminOnly: false },
  { name: "Punto de Venta", path: "/pos", icon: ShoppingCart, adminOnly: false },
  { name: "Inventario", path: "/inventory", icon: Package, adminOnly: false },
  { name: "Clientes", path: "/customers", icon: Users, adminOnly: false },
  { name: "Reportes", path: "/reports", icon: FileText, adminOnly: false },
  { name: "Configuración", path: "/settings", icon: Settings, adminOnly: true },
  { name: "Usuarios", path: "/users", icon: Shield, adminOnly: true },
  { name: "Códigos de Acceso", path: "/access-codes", icon: KeyRound, adminOnly: true },
];

export const Navigation = () => {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
  );

  // Mobile: mostrar solo iconos en barra inferior
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <nav className="flex justify-around items-center w-full">
        {filteredNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Desktop: sidebar completa
  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col z-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          POS System
        </h1>
        {profile && (
          <div className="mt-4">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            {role && (
              <p className="text-xs text-primary mt-1">
                {role === "admin" ? "Administrador" : "Cajero"}
              </p>
            )}
          </div>
        )}
      </div>

      <Separator className="mb-4" />

      <div className="space-y-2 flex-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                isActive
                  ? "bg-gradient-primary text-white shadow-elegant"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <Separator className="my-4" />

      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={signOut}
      >
        <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
        <span className="truncate">Cerrar Sesión</span>
      </Button>
    </nav>
  );
};
