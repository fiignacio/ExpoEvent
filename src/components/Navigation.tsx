import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingCart, Package, Users, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: ShoppingCart, label: "Punto de Venta", path: "/pos" },
  { icon: Package, label: "Inventario", path: "/inventory" },
  { icon: Users, label: "Clientes", path: "/customers" },
  { icon: TrendingUp, label: "Reportes", path: "/reports" },
  { icon: Settings, label: "Configuración", path: "/settings" },
];

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="bg-card border-r border-border h-screen w-64 fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          TPV Pro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Sistema de Ventas</p>
      </div>
      
      <div className="flex-1 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary bg-primary/10 border-r-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      
      <div className="p-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin</p>
            <p className="text-xs text-muted-foreground truncate">admin@tpvpro.com</p>
          </div>
        </div>
      </div>
    </nav>
  );
};
