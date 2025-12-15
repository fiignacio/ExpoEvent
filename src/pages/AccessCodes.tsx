import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ToggleLeft, ToggleRight, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AccessCode {
  id: string;
  code: string;
  role: "admin" | "cashier";
  user_name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function AccessCodes() {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "cashier">("cashier");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccessCodes();
  }, []);

  const fetchAccessCodes = async () => {
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar códigos");
      return;
    }

    setAccessCodes(data || []);
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCode.trim() || !newUserName.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("access_codes")
      .insert({
        code: newCode.toUpperCase().trim(),
        user_name: newUserName.trim(),
        role: newRole,
      });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Este código ya existe");
      } else {
        toast.error("Error al crear código");
      }
      return;
    }

    toast.success("Código creado exitosamente");
    setNewCode("");
    setNewUserName("");
    setNewRole("cashier");
    setShowDialog(false);
    fetchAccessCodes();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("access_codes")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Error al actualizar estado");
      return;
    }

    toast.success(currentStatus ? "Código desactivado" : "Código activado");
    fetchAccessCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este código?")) {
      return;
    }

    const { error } = await supabase
      .from("access_codes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error al eliminar código");
      return;
    }

    toast.success("Código eliminado");
    fetchAccessCodes();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Códigos de Acceso</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los códigos de acceso para usuarios
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Código
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Códigos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {accessCodes.length === 0 ? (
            <div className="text-center py-12">
              <KeyRound className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay códigos registrados. Crea el primero.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-bold">
                      {code.code}
                    </TableCell>
                    <TableCell>{code.user_name}</TableCell>
                    <TableCell>
                      <Badge variant={code.role === "admin" ? "default" : "secondary"}>
                        {code.role === "admin" ? "Administrador" : "Cajero"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.is_active ? "default" : "outline"}>
                        {code.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.last_used_at
                        ? new Date(code.last_used_at).toLocaleDateString()
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(code.id, code.is_active)}
                      >
                        {code.is_active ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(code.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Crear Nuevo Código</DialogTitle>
            <DialogDescription>
              Genera un código de acceso para un nuevo usuario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCode} className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  required
                  maxLength={10}
                  className="font-mono"
                />
                <Button type="button" onClick={generateRandomCode} variant="outline">
                  Generar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-name">Nombre del Usuario</Label>
              <Input
                id="user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={newRole} onValueChange={(value: "admin" | "cashier") => setNewRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cajero</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Creando..." : "Crear Código"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
