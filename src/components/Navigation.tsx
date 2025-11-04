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
];

export const Navigation = () => {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
  );

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          POS System
        </h1>
        {profile && (
          <div className="mt-4">
            <p className="text-sm font-medium">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            {role && (
              <p className="text-xs text-primary mt-1">
                {role === "admin" ? "Administrador" : "Cajero"}
              </p>
            )}
          </div>
        )}
      </div>

      <Separator className="mb-4" />

      <div className="space-y-2 flex-1">
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
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
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
        <LogOut className="w-5 h-5 mr-3" />
        Cerrar Sesión
      </Button>
    </nav>
  );
};
