import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ShoppingCart, KeyRound } from "lucide-react";

export default function Auth() {
  const { signInWithCode } = useAuth();
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      return;
    }
    setLoading(true);
    await signInWithCode(accessCode.trim());
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Sistema POS</CardTitle>
          <CardDescription>Ingresa tu código de acceso para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="access-code">Código de Acceso</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="access-code"
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  required
                  placeholder="INGRESA TU CÓDIGO"
                  className="pl-10 text-center text-lg font-semibold tracking-wider"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Solicita tu código de acceso al administrador
              </p>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Verificando código..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
