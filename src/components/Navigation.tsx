import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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
  BarChart3,
  MoreHorizontal,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, key: "dashboard" },
  { name: "Punto de Venta", path: "/pos", icon: ShoppingCart, key: "pos" },
  { name: "Inventario & Promos", path: "/inventory", icon: Package, key: "inventory" },
  { name: "Reportes & Ventas", path: "/reports", icon: FileText, key: "reports" },
  { name: "Clientes", path: "/customers", icon: Users, key: "customers" },
  { name: "Dashboard Clientes", path: "/customer-dashboard", icon: BarChart3, key: "customer_dashboard" },
  { name: "Configuración", path: "/settings", icon: Settings, key: "settings" },
  { name: "Usuarios", path: "/users", icon: Shield, key: "users" },
  { name: "Códigos de Acceso", path: "/access-codes", icon: KeyRound, key: "access_codes" },
];

export const Navigation = () => {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!role) return;

      try {
        const { data } = await supabase
          .from('role_permissions')
          .select('menu_item, enabled')
          .eq('role', role);

        if (data && data.length > 0) {
          const permsMap: Record<string, boolean> = {};
          data.forEach(perm => {
            permsMap[perm.menu_item] = perm.enabled;
          });
          setPermissions(permsMap);
        }
      } catch (e) {
        console.log("Permissions fetch skipped:", e);
      }
    };

    fetchPermissions();
  }, [role]);

  const hasPermissions = Object.keys(permissions).length > 0;
  const filteredNavItems = hasPermissions 
    ? navItems.filter((item) => permissions[item.key] === true)
    : navItems; // Mostrar navItems por defecto si no hay restricciones explícitas

  if (isMobile) {
    const visibleItems = filteredNavItems.slice(0, 4);
    const hiddenItems = filteredNavItems.slice(4);

    return (
      <nav className="flex justify-around items-center w-full">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
        
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all text-muted-foreground">
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium">Más</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                ExpoVentas POS
              </SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-2">
              {hiddenItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
              
              <Separator className="my-3" />
              
              {profile && (
                <div className="px-4 py-2 mb-2">
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-muted-foreground">Tema</span>
                <ThemeToggle />
              </div>
              
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={signOut}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Cerrar Sesión
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    );
  }

  // Desktop: sidebar completa
  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col z-50">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-white shadow-md">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold bg-gradient-primary bg-clip-text text-transparent leading-tight">
              ExpoVentas POS
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium">Ventas para Eventos</p>
          </div>
        </div>

        {profile ? (
          <div className="mt-4 p-2.5 rounded-lg bg-accent/40 border border-border/50">
            <p className="text-xs font-semibold truncate">{profile.full_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                {role === "admin" ? "Administrador" : "Cajero Evento"}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Modo Evento Activo
            </span>
          </div>
        )}
      </div>

      <Separator className="mb-4" />

      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200",
                isActive
                  ? "bg-gradient-primary text-white shadow-md font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-muted-foreground">Apariencia</span>
        <ThemeToggle />
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        onClick={signOut}
      >
        <LogOut className="w-4 h-4 mr-2.5 flex-shrink-0" />
        <span className="truncate text-xs font-medium">Cerrar Sesión</span>
      </Button>
    </nav>
  );
};

