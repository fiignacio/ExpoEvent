import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Product } from "@/types/product";

export interface EventBackupData {
  version: string;
  appName: string;
  timestamp: string;
  eventDate: string;
  products: Product[];
  sales: any[];
  customers: any[];
  settings: any;
}

const LOCAL_PRODUCTS_KEY = "expoventas_products";
const OFFLINE_SALES_KEY = "offline_sales";
const CUSTOMERS_KEY = "expoventas_customers";
const SETTINGS_KEY = "pos_settings";

/**
 * Exporta TODOS los datos del evento a un archivo JSON comprimido y/o Excel completo
 */
export function exportFullEventJSONBackup() {
  try {
    const products = JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY) || "[]");
    const sales = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || "[]");
    const customers = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || "[]");
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

    const backupData: EventBackupData = {
      version: "1.0.0",
      appName: "ExpoVentas POS",
      timestamp: new Date().toISOString(),
      eventDate: new Date().toLocaleDateString("es-CL"),
      products,
      sales,
      customers,
      settings,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    const filename = `Respaldo_Evento_${new Date().toISOString().split("T")[0]}.json`;
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast.success(`Copia de seguridad guardada como ${filename}`);
  } catch (error: any) {
    toast.error("Error al generar copia de seguridad: " + error.message);
  }
}

/**
 * Exporta el reporte y respaldo completo del evento a un Libro de Excel (.xlsx) con hojas múltiples
 */
export function exportFullEventExcelBackup() {
  try {
    const products: Product[] = JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY) || "[]");
    const sales: any[] = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || "[]");
    const customers: any[] = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || "[]");

    const workbook = XLSX.utils.book_new();

    // 1. Hoja de Productos / Inventario
    const productsData = products.map(p => ({
      ID: p.id,
      SKU: p.sku,
      Nombre: p.name,
      Categoría: p.category,
      Stock: p.stock,
      Precio: p.price,
      Costo: p.cost,
      "Margen Estimado ($)": p.price - p.cost,
      "Tipo Promo": p.promotion?.type || "Ninguna",
      "Cant. Promo": p.promotion?.quantity || "",
      "Precio Promo": p.promotion?.discountedPrice || "",
    }));
    const wsProducts = XLSX.utils.json_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, wsProducts, "Inventario Evento");

    // 2. Hoja de Ventas y Transacciones
    const salesData = sales.map(s => ({
      ID: s.id,
      Fecha: new Date(s.timestamp || Date.now()).toLocaleString("es-CL"),
      "Total ($)": s.total,
      Subtotal: s.subtotal,
      Impuesto: s.tax,
      "Método Pago": s.paymentMethod,
      "Cambio Dado": s.changeAmount || 0,
      "Cant. Items": (s.items || []).reduce((acc: number, item: any) => acc + item.quantity, 0),
      "Detalle Items": (s.items || []).map((i: any) => `${i.quantity}x ${i.name}`).join(", "),
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData.length > 0 ? salesData : [{ Mensaje: "No hay ventas registradas aún" }]);
    XLSX.utils.book_append_sheet(workbook, wsSales, "Ventas Realizadas");

    // 3. Hoja de Clientes
    const customersData = customers.map(c => ({
      ID: c.id,
      Nombre: c.name,
      Tipo: c.type,
      Email: c.email || "",
      Teléfono: c.phone || "",
      Notas: c.notes || "",
    }));
    const wsCustomers = XLSX.utils.json_to_sheet(customersData.length > 0 ? customersData : [{ Mensaje: "No hay clientes registrados" }]);
    XLSX.utils.book_append_sheet(workbook, wsCustomers, "Clientes y Contactos");

    // 4. Resumen Ejecutivo
    const totalIngresos = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalTransacciones = sales.length;
    const totalProductosDiferentes = products.length;
    const stockTotalItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    const summaryData = [
      { Métrica: "Fecha de Reporte", Valor: new Date().toLocaleString("es-CL") },
      { Métrica: "Total Ingresos por Ventas", Valor: `$${totalIngresos.toLocaleString('es-CL')}` },
      { Métrica: "Total Transacciones", Valor: totalTransacciones },
      { Métrica: "Ticket Promedio", Valor: totalTransacciones > 0 ? `$${Math.round(totalIngresos / totalTransacciones).toLocaleString('es-CL')}` : "$0" },
      { Métrica: "Variedad de Productos", Valor: totalProductosDiferentes },
      { Métrica: "Stock Disponible Restante", Valor: stockTotalItems },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Resumen Evento");

    const filename = `Reporte_Respaldo_Evento_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast.success(`Reporte Excel generado como ${filename}`);
  } catch (error: any) {
    toast.error("Error al exportar a Excel: " + error.message);
  }
}

/**
 * Restaura el estado completo de la aplicación desde un archivo JSON de respaldo
 */
export function importFullEventJSONBackup(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data: EventBackupData = JSON.parse(content);

        if (!data.products || !Array.isArray(data.products)) {
          throw new Error("El archivo no contiene una estructura válida de respaldo.");
        }

        if (data.products) localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(data.products));
        if (data.sales) localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(data.sales));
        if (data.customers) localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(data.customers));
        if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));

        toast.success("¡Respaldo restaurado con éxito!");
        resolve(true);
      } catch (err: any) {
        toast.error("Error al importar copia de seguridad: " + err.message);
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
