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
  { name: "Inventario", path: "/inventory", icon: Package, key: "inventory" },
  { name: "Clientes", path: "/customers", icon: Users, key: "customers" },
  { name: "Reportes", path: "/reports", icon: FileText, key: "reports" },
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

      const { data } = await supabase
        .from('role_permissions')
        .select('menu_item, enabled')
        .eq('role', role);

      const permsMap: Record<string, boolean> = {};
      data?.forEach(perm => {
        permsMap[perm.menu_item] = perm.enabled;
      });
      setPermissions(permsMap);
    };

    fetchPermissions();
  }, [role]);

  // Si no hay permisos cargados aún, mostrar al menos Dashboard
  const hasPermissions = Object.keys(permissions).length > 0;
  const filteredNavItems = hasPermissions 
    ? navItems.filter((item) => permissions[item.key] === true)
    : [navItems[0]]; // Solo Dashboard mientras cargan permisos

  if (isMobile) {
    // Solo mostrar 3 items para garantizar espacio para el botón "Más"
    const visibleItems = filteredNavItems.slice(0, 3);
    const hiddenItems = filteredNavItems.slice(3);

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
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
        
        {/* Siempre mostrar el botón Más para acceder al logout */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all text-muted-foreground">
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium">Más</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh]">
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
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
                        ? "bg-primary/10 text-primary"
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

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">Tema</span>
        <ThemeToggle />
      </div>

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
