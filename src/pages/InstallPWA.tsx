import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar si la app ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar el evento de instalación
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.error("La instalación no está disponible en este momento");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success("¡Aplicación instalada correctamente!");
      setIsInstalled(true);
    } else {
      toast.info("Instalación cancelada");
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Instalar Aplicación</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Instala Point Smart Hub en tu dispositivo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-6 h-6" />
            Aplicación Web Progresiva (PWA)
          </CardTitle>
          <CardDescription>
            Instala nuestra app para acceso rápido y funcionalidad offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-success" />
              <p className="text-lg font-semibold text-center">
                ¡La aplicación ya está instalada!
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Puedes acceder desde el menú de aplicaciones de tu dispositivo
              </p>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <div className="bg-gradient-subtle p-6 rounded-lg text-center">
                <Download className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground mb-4">
                  Haz clic en el botón para instalar la aplicación en tu dispositivo
                </p>
                <Button 
                  onClick={handleInstall}
                  size="lg"
                  className="bg-gradient-primary"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Instalar Aplicación
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-6 rounded-lg">
                <h3 className="font-semibold mb-3">Cómo instalar manualmente:</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong className="text-primary">En Android (Chrome):</strong>
                    <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                      <li>Toca el menú (⋮) en la esquina superior derecha</li>
                      <li>Selecciona "Instalar aplicación" o "Añadir a pantalla de inicio"</li>
                      <li>Confirma la instalación</li>
                    </ol>
                  </div>
                  <div>
                    <strong className="text-primary">En iOS (Safari):</strong>
                    <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                      <li>Toca el botón Compartir (cuadrado con flecha hacia arriba)</li>
                      <li>Desplázate y selecciona "Añadir a pantalla de inicio"</li>
                      <li>Toca "Añadir"</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="bg-accent/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-sm">Beneficios de instalar:</h3>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Acceso rápido desde tu pantalla de inicio</li>
                  <li>Experiencia de aplicación nativa</li>
                  <li>Funciona sin conexión (modo offline)</li>
                  <li>Notificaciones push (próximamente)</li>
                  <li>Actualizaciones automáticas</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
