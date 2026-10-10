import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Product } from "@/types/product";
import { getPromotionLabel } from "@/utils/promotions";

export interface ExportOptions {
  scopeTitle?: string;
  filterDescription?: string;
}

// Formateador de moneda para visualización (CLP)
export const formatCurrency = (val: number): string => {
  return `$${Math.round(val).toLocaleString("es-CL")}`;
};

// Determina la etiqueta de stock
const getStockStatus = (stock: number): string => {
  if (stock <= 0) return "Agotado";
  if (stock < 10) return "Crítico / Bajo";
  if (stock < 50) return "Medio";
  return "Óptimo";
};

// Calcula estadísticas del conjunto de productos
export const computeInventoryStats = (products: Product[]) => {
  const totalProducts = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalCostValue = products.reduce((acc, p) => acc + (Number(p.stock) || 0) * (Number(p.cost) || 0), 0);
  const totalRetailValue = products.reduce((acc, p) => acc + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);
  const potentialProfit = totalRetailValue - totalCostValue;
  const averageMargin = totalRetailValue > 0 ? ((potentialProfit / totalRetailValue) * 100).toFixed(1) : "0.0";
  const lowStockCount = products.filter((p) => Number(p.stock) < 10).length;
  const outOfStockCount = products.filter((p) => Number(p.stock) <= 0).length;

  // Resumen por categoría
  const categoryMap = new Map<string, { count: number; units: number; cost: number; retail: number }>();
  products.forEach((p) => {
    const cat = p.category || "Sin Categoría";
    const current = categoryMap.get(cat) || { count: 0, units: 0, cost: 0, retail: 0 };
    const stock = Number(p.stock) || 0;
    const cost = Number(p.cost) || 0;
    const price = Number(p.price) || 0;

    current.count += 1;
    current.units += stock;
    current.cost += stock * cost;
    current.retail += stock * price;
    categoryMap.set(cat, current);
  });

  const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
    name,
    ...data,
  }));

  return {
    totalProducts,
    totalUnits,
    totalCostValue,
    totalRetailValue,
    potentialProfit,
    averageMargin,
    lowStockCount,
    outOfStockCount,
    categories,
  };
};

/**
 * Exporta el catálogo o selección a archivo Excel (.xlsx) con 2 hojas:
 * 1. "Inventario Detallado" con todas las columnas numéricas para fórmulas.
 * 2. "Resumen Ejecutivo" con estadísticas globales y desglose por categoría.
 */
export async function exportInventoryToExcel(products: Product[], options?: ExportOptions) {
  try {
    if (!products || products.length === 0) {
      toast.warning("No hay productos disponibles para exportar");
      return;
    }

    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    const stats = computeInventoryStats(products);
    const scopeName = options?.scopeTitle || "Todos los Productos";

    const wb = XLSX.utils.book_new();

    // 1. Hoja de Productos Detallados
    const productsData = products.map((item) => {
      const stock = Number(item.stock) || 0;
      const cost = Number(item.cost) || 0;
      const price = Number(item.price) || 0;
      const margin = price > 0 ? Number(((price - cost) / price * 100).toFixed(1)) : 0;
      const totalCost = stock * cost;
      const totalRetail = stock * price;
      const profit = totalRetail - totalCost;
      const promoText = item.promotion ? getPromotionLabel(item) : "Sin promoción";

      return {
        "SKU": item.sku || "-",
        "Nombre": item.name || "-",
        "Categoría": item.category || "General",
        "Stock (Unidades)": stock,
        "Estado Stock": getStockStatus(stock),
        "Costo Unitario ($)": cost,
        "Precio Venta ($)": price,
        "Margen (%)": margin,
        "Valor Total Costo ($)": totalCost,
        "Valor Total Venta ($)": totalRetail,
        "Ganancia Potencial ($)": profit,
        "Promoción": promoText,
      };
    });

    const wsProducts = XLSX.utils.json_to_sheet(productsData);

    // Auto-ajuste de ancho de columnas
    const colWidths = Object.keys(productsData[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...productsData.map((row) => String((row as any)[key] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
    });
    wsProducts["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, wsProducts, "Inventario");

    // 2. Hoja de Resumen Ejecutivo y Categorías
    const summaryData: any[] = [
      { "Métrica": "Reporte", "Detalle / Valor": "INVENTARIO GENERAL - POINT SMART HUB" },
      { "Métrica": "Ámbito de Datos", "Detalle / Valor": scopeName },
      { "Métrica": "Fecha de Generación", "Detalle / Valor": format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es }) },
      { "Métrica": "Filtros aplicados", "Detalle / Valor": options?.filterDescription || "Ninguno" },
      { "Métrica": "", "Detalle / Valor": "" },
      { "Métrica": "Total de Productos (Referencias)", "Detalle / Valor": stats.totalProducts },
      { "Métrica": "Total de Unidades Físicas", "Detalle / Valor": stats.totalUnits },
      { "Métrica": "Valor Total a Costo ($)", "Detalle / Valor": stats.totalCostValue },
      { "Métrica": "Valor Total a Venta ($)", "Detalle / Valor": stats.totalRetailValue },
      { "Métrica": "Ganancia Potencial Estimada ($)", "Detalle / Valor": stats.potentialProfit },
      { "Métrica": "Margen Promedio Global (%)", "Detalle / Valor": `${stats.averageMargin}%` },
      { "Métrica": "Productos con Stock Crítico (< 10)", "Detalle / Valor": stats.lowStockCount },
      { "Métrica": "Productos Agotados (0)", "Detalle / Valor": stats.outOfStockCount },
      { "Métrica": "", "Detalle / Valor": "" },
      { "Métrica": "--- RESUMEN POR CATEGORÍA ---", "Detalle / Valor": "" },
    ];

    stats.categories.forEach((cat) => {
      summaryData.push({
        "Métrica": `Categoría: ${cat.name}`,
        "Detalle / Valor": `${cat.count} prods | ${cat.units} unid. | Costo: $${cat.cost.toLocaleString("es-CL")} | Venta: $${cat.retail.toLocaleString("es-CL")}`,
      });
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General");

    // Generar archivo binario y descargar
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const safeName = `inventario_${timestamp}.xlsx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);

    toast.success(`Excel exportado exitosamente (${products.length} productos)`);
  } catch (err: any) {
    console.error("Error al exportar inventario a Excel:", err);
    toast.error(`Error al exportar a Excel: ${err?.message || "Error desconocido"}`);
  }
}

/**
 * Exporta el inventario a un archivo PDF estructurado y estilizado en formato horizontal (Landscape)
 */
export async function exportInventoryToPdf(products: Product[], options?: ExportOptions) {
  try {
    if (!products || products.length === 0) {
      toast.warning("No hay productos disponibles para exportar a PDF");
      return;
    }

    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    const dateFormatted = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
    const stats = computeInventoryStats(products);
    const scopeName = options?.scopeTitle || "Todos los Productos";

    // Creamos documento PDF en orientación horizontal A4 para que quepan holgadamente las columnas
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Barra superior decorativa
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 24, "F");

    // Título en la barra superior
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("INFORME DE INVENTARIO - POINT SMART HUB", 14, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // Slate-300
    doc.text(`Fecha de emisión: ${dateFormatted}  |  Alcance: ${scopeName}`, 14, 18);

    doc.text(`Total registros: ${products.length}`, pageWidth - 14, 15, { align: "right" });

    // 2. Tarjetas KPI / Cajas de resumen superior
    const startY = 29;
    const boxHeight = 16;
    const marginX = 14;
    const availableWidth = pageWidth - marginX * 2;
    const gap = 4;
    const boxWidth = (availableWidth - gap * 4) / 5;

    const kpiBoxes = [
      { label: "PRODUCTOS", value: `${stats.totalProducts}`, color: [241, 245, 249], border: [203, 213, 225] },
      { label: "UNIDADES TOTALES", value: `${stats.totalUnits}`, color: [241, 245, 249], border: [203, 213, 225] },
      { label: "VALOR EN COSTO", value: formatCurrency(stats.totalCostValue), color: [241, 245, 249], border: [203, 213, 225] },
      { label: "VALOR EN VENTA", value: formatCurrency(stats.totalRetailValue), color: [236, 253, 245], border: [167, 243, 208] },
      {
        label: "STOCK CRÍTICO (<10)",
        value: `${stats.lowStockCount}`,
        color: stats.lowStockCount > 0 ? [254, 242, 242] : [241, 245, 249],
        border: stats.lowStockCount > 0 ? [254, 202, 202] : [203, 213, 225],
        isAlert: stats.lowStockCount > 0,
      },
    ];

    kpiBoxes.forEach((kpi, idx) => {
      const bx = marginX + idx * (boxWidth + gap);
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(bx, startY, boxWidth, boxHeight, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(kpi.isAlert ? 185 : 100, kpi.isAlert ? 28 : 116, kpi.isAlert ? 28 : 139);
      doc.text(kpi.label, bx + 4, startY + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(kpi.isAlert ? 220 : 15, kpi.isAlert ? 38 : 23, kpi.isAlert ? 38 : 42);
      doc.text(kpi.value, bx + 4, startY + 12);
    });

    // 3. Preparar filas para autoTable
    const head = [
      [
        "SKU",
        "Nombre del Producto",
        "Categoría",
        "Stock",
        "Costo Unit.",
        "Precio Venta",
        "Margen %",
        "Total Costo",
        "Total Venta",
        "Promoción",
      ],
    ];

    const body = products.map((item) => {
      const stock = Number(item.stock) || 0;
      const cost = Number(item.cost) || 0;
      const price = Number(item.price) || 0;
      const margin = price > 0 ? ((price - cost) / price * 100).toFixed(1) + "%" : "0.0%";
      const promo = item.promotion ? getPromotionLabel(item) : "-";

      return [
        item.sku || "-",
        item.name || "-",
        item.category || "-",
        stock.toString(),
        formatCurrency(cost),
        formatCurrency(price),
        margin,
        formatCurrency(stock * cost),
        formatCurrency(stock * price),
        promo,
      ];
    });

    // Fila de totales en el pie de la tabla
    const foot = [
      [
        "TOTALES",
        `${products.length} productos`,
        "-",
        `${stats.totalUnits}`,
        "-",
        "-",
        `${stats.averageMargin}%`,
        formatCurrency(stats.totalCostValue),
        formatCurrency(stats.totalRetailValue),
        "-",
      ],
    ];

    autoTable(doc, {
      startY: startY + boxHeight + 5,
      head: head,
      body: body,
      foot: foot,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [30, 41, 59],
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: "bold" }, // SKU
        1: { cellWidth: "auto" }, // Nombre
        2: { cellWidth: 32 }, // Categoría
        3: { cellWidth: 18, halign: "center" }, // Stock
        4: { cellWidth: 24, halign: "right" }, // Costo
        5: { cellWidth: 24, halign: "right" }, // Precio
        6: { cellWidth: 20, halign: "center" }, // Margen
        7: { cellWidth: 26, halign: "right" }, // Total Costo
        8: { cellWidth: 26, halign: "right" }, // Total Venta
        9: { cellWidth: 28, halign: "center" }, // Promoción
      },
      didParseCell: (data) => {
        // Resaltar en rojo si el stock es bajo en la sección de cuerpo
        if (data.section === "body" && data.column.index === 3) {
          const stockVal = Number(data.cell.raw);
          if (stockVal < 10) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      didDrawPage: (data) => {
        // Pie de página en cada página
        const totalPages = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(
          `Point Smart Hub | Sistema de Ventas e Inventario`,
          marginX,
          pageHeight - 6
        );
        doc.text(
          `Página ${currentPage} de ${totalPages}`,
          pageWidth - marginX,
          pageHeight - 6,
          { align: "right" }
        );
      },
      margin: { left: marginX, right: marginX, bottom: 12 },
    });

    const safeName = `inventario_${timestamp}.pdf`;
    doc.save(safeName);

    toast.success(`PDF generado exitosamente (${products.length} productos)`);
  } catch (err: any) {
    console.error("Error al exportar inventario a PDF:", err);
    toast.error(`Error al exportar a PDF: ${err?.message || "Error desconocido"}`);
  }
}
