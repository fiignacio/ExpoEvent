import { useState, useEffect } from "react";
import { Download, Upload, ShieldCheck, Database, FileSpreadsheet, HardDrive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { exportFullEventJSONBackup, exportFullEventExcelBackup, importFullEventJSONBackup } from "@/utils/backupManager";
import { initPersistentStorage, getStorageQuotaInfo } from "@/utils/persistentStorage";
import { toast } from "sonner";

export function EventBackupDialog() {
  const [open, setOpen] = useState(false);
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [quotaInfo, setQuotaInfo] = useState({ usedMB: "0", quotaMB: "0" });

  useEffect(() => {
    checkStorageStatus();
  }, [open]);

  const checkStorageStatus = async () => {
    if (navigator.storage && navigator.storage.persisted) {
      const persisted = await navigator.storage.persisted();
      setIsPersisted(persisted);
    }
    const info = await getStorageQuotaInfo();
    setQuotaInfo(info);
  };

  const handleActivatePersistence = async () => {
    const granted = await initPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      toast.success("¡Almacenamiento persistente activado con éxito!");
    } else {
      toast.info("El navegador mantendrá tus datos en caché local segura.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importFullEventJSONBackup(file);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/5">
          <Database className="w-4 h-4 text-primary" />
          <span>Respaldos & Exportación Evento</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            Respaldos y Seguridad de Datos
          </DialogTitle>
          <DialogDescription>
            Tus datos de ventas e inventario del evento están guardados localmente. Puedes exportar una copia completa en cualquier momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status del Almacenamiento Persistente */}
          <Card className="bg-accent/40 border-accent">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-primary" />
                  Estado del Almacenamiento Local
                </span>
                <Badge variant={isPersisted ? "default" : "secondary"} className="text-[10px]">
                  {isPersisted ? "Protegido Persistente" : "Estándar"}
                </Badge>
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                <span>Espacio ocupado: {quotaInfo.usedMB} MB</span>
                <span>Cuota total: {quotaInfo.quotaMB} MB</span>
              </div>

              {!isPersisted && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="w-full mt-2 text-xs h-8"
                  onClick={handleActivatePersistence}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                  Activar Protección Anti-Borrado
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Opciones de Exportación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="default"
              className="h-auto py-3 px-4 flex flex-col items-start gap-1 text-left bg-gradient-primary"
              onClick={exportFullEventExcelBackup}
            >
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Libro Excel
              </div>
              <span className="text-[10px] text-white/80 font-normal">
                Genera reporte completo en Excel (.xlsx) con inventario, ventas y métricas.
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex flex-col items-start gap-1 text-left border-primary/40 hover:bg-primary/5"
              onClick={exportFullEventJSONBackup}
            >
              <div className="flex items-center gap-1.5 font-semibold text-sm text-primary">
                <Download className="w-4 h-4" />
                Copia JSON de Seguridad
              </div>
              <span className="text-[10px] text-muted-foreground font-normal">
                Archivo plano comprimido ideal para restaurar o transferir a otro equipo.
              </span>
            </Button>
          </div>

          {/* Restaurar Respaldo */}
          <div className="border border-dashed rounded-lg p-3 text-center space-y-2 bg-card">
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold">Restaurar Copia de Seguridad</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Selecciona un archivo `.json` de respaldo para cargar todas las ventas e inventario guardados.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="backup-upload"
            />
            <label htmlFor="backup-upload" className="inline-block">
              <Button asChild variant="secondary" size="sm" className="h-7 text-xs">
                <span>Cargar Respaldo JSON</span>
              </Button>
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
