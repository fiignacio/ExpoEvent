import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users as UsersIcon, Shield, Edit, Menu } from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "cashier";
  created_at: string;
}

interface RolePermission {
  id: string;
  role: "admin" | "cashier";
  menu_item: string;
  enabled: boolean;
}

const menuItems = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pos", label: "Punto de Venta" },
  { key: "inventory", label: "Inventario" },
  { key: "customers", label: "Clientes" },
  { key: "reports", label: "Reportes" },
  { key: "settings", label: "Configuración" },
  { key: "users", label: "Usuarios" },
  { key: "access_codes", label: "Códigos de Acceso" },
];

export default function Users() {
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<"admin" | "cashier">("admin");

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [selectedRole]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          return {
            id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name,
            role: roleData?.role || "cashier",
            created_at: profile.created_at,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("Error al cargar usuarios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", selectedRole)
        .order("menu_item");

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      toast.error("Error al cargar permisos: " + error.message);
    }
  };

  const updateUserRole = async (userId: string, newRole: "admin" | "cashier") => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Rol actualizado correctamente");
      fetchUsers();
    } catch (error: any) {
      toast.error("Error al actualizar rol: " + error.message);
    }
  };

  const updateUserProfile = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: editName,
          email: editEmail 
        })
        .eq("user_id", editingUser.id);

      if (error) throw error;

      toast.success("Perfil actualizado correctamente");
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error("Error al actualizar perfil: " + error.message);
    }
  };

  const updatePermission = async (permissionId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("role_permissions")
        .update({ enabled })
        .eq("id", permissionId);

      if (error) throw error;

      toast.success("Permiso actualizado correctamente");
      fetchPermissions();
    } catch (error: any) {
      toast.error("Error al actualizar permiso: " + error.message);
    }
  };

  if (currentUserRole !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta página</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">Administra los roles, perfiles y permisos</p>
        </div>
        <div className="flex items-center gap-2">
          <UsersIcon className="h-8 w-8 text-primary" />
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="permissions">Permisos de Menú</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Administrador
                            </>
                          ) : (
                            "Cajero"
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => {
                            if (!open) setEditingUser(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditName(user.full_name);
                                  setEditEmail(user.email);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Perfil</DialogTitle>
                                <DialogDescription>
                                  Modifica la información del usuario
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="name">Nombre Completo</Label>
                                  <Input
                                    id="name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="email">Correo Electrónico</Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                  />
                                </div>
                                <Button onClick={updateUserProfile} className="w-full">
                                  Guardar Cambios
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Select
                            value={user.role}
                            onValueChange={(value: "admin" | "cashier") =>
                              updateUserRole(user.id, value)
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="cashier">Cajero</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permisos de Menú por Rol</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Seleccionar Rol</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: "admin" | "cashier") => setSelectedRole(value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Administrador
                      </div>
                    </SelectItem>
                    <SelectItem value="cashier">Cajero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {permissions.map((permission) => {
                  const menuItem = menuItems.find(item => item.key === permission.menu_item);
                  return (
                    <div key={permission.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Menu className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{menuItem?.label || permission.menu_item}</p>
                          <p className="text-sm text-muted-foreground">
                            Acceso al módulo de {menuItem?.label?.toLowerCase() || permission.menu_item}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={permission.enabled}
                        onCheckedChange={(checked) => updatePermission(permission.id, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Permisos por Rol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Administrador</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>✓ Acceso completo a todas las funciones</li>
                <li>✓ Gestión de productos e inventario</li>
                <li>✓ Configuración del sistema</li>
                <li>✓ Gestión de usuarios y roles</li>
                <li>✓ Reportes y análisis</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Cajero</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>✓ Punto de venta (POS)</li>
                <li>✓ Ver inventario</li>
                <li>✓ Ver clientes</li>
                <li>✗ No puede modificar configuraciones</li>
                <li>✗ No puede gestionar usuarios</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
