import { toast } from "sonner";

/**
 * Solicita al navegador otorgar almacenamiento persistente
 * para que IndexedDB y localStorage NUNCA sean borrados por el sistema.
 */
export async function initPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) {
        console.log("💾 Almacenamiento local persistente ya activado.");
        return true;
      }
      
      const granted = await navigator.storage.persist();
      if (granted) {
        console.log("✅ Almacenamiento persistente concedido por el navegador.");
      } else {
        console.warn("⚠️ El navegador no otorgó persistencia automática, los datos se conservarán en caché local.");
      }
      return granted;
    } catch (error) {
      console.error("Error al solicitar almacenamiento persistente:", error);
      return false;
    }
  }
  return false;
}

/**
 * Obtiene el uso estimado de espacio de almacenamiento local
 */
export async function getStorageQuotaInfo(): Promise<{ usedMB: string; quotaMB: string }> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
      return { usedMB, quotaMB };
    } catch {
      return { usedMB: "0", quotaMB: "Indefinido" };
    }
  }
  return { usedMB: "0", quotaMB: "Indefinido" };
}
