import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { SoldProduct } from "@/hooks/useReports";

export interface ReportProductExportOptions {
  periodLabel: string;
  dateRangeText?: string;
  startDate?: Date;
  endDate?: Date;
}

const formatCurrency = (val: number): string => {
  return `$${Math.round(val || 0).toLocaleString("es-CL")}`;
};

/**
 * Exporta el reporte consolidado de productos vendidos a Excel (.xlsx)
 */
export async function exportSoldProductsToExcel(
  products: SoldProduct[],
  options: ReportProductExportOptions
) {
  try {
    if (!products || products.length === 0) {
      toast.warning("No hay productos vendidos en el período seleccionado para exportar.");
      return;
    }

    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    const wb = XLSX.utils.book_new();

    const totalUnits = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const totalRevenue = products.reduce((acc, p) => acc + (p.totalRevenue || 0), 0);
    const totalCost = products.reduce((acc, p) => acc + (p.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const globalMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

    // 1. Hoja Principal: Productos Vendidos Consolidado
    const detailedData = products.map((item, idx) => ({
      "#": idx + 1,
      "SKU": item.sku || "-",
      "Nombre del Producto": item.name || "-",
      "Categoría": item.category || "General",
      "Cantidad Vendida (Unid.)": item.quantity || 0,
      "Precio Unitario ($)": item.unitPrice || 0,
      "Total Ventas ($)": item.totalRevenue || 0,
      "Costo Unitario ($)": item.cost || 0,
      "Total Costo ($)": item.totalCost || 0,
      "Ganancia Neta ($)": item.profit || 0,
      "Margen (%)": item.margin || 0,
      "% del Total Ventas": `${item.percentageOfSales || 0}%`,
    }));

    const wsProducts = XLSX.utils.json_to_sheet(detailedData);

    // Ajuste de anchos de columnas
    const colWidths = Object.keys(detailedData[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...detailedData.map((row) => String((row as any)[key] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 8), 45) };
    });
    wsProducts["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, wsProducts, "Ventas por Producto");

    // 2. Hoja de Resumen del Período
    // Agrupación por categoría
    const categoryStats = new Map<string, { units: number; revenue: number; itemsCount: number }>();
    products.forEach((p) => {
      const cat = p.category || "General";
      const cur = categoryStats.get(cat) || { units: 0, revenue: 0, itemsCount: 0 };
      cur.units += p.quantity;
      cur.revenue += p.totalRevenue;
      cur.itemsCount += 1;
      categoryStats.set(cat, cur);
    });

    const summaryData: any[] = [
      { "Métrica": "Reporte", "Detalle": "REPORTE CONSOLIDADO DE PRODUCTOS VENDIDOS" },
      { "Métrica": "Período", "Detalle": options.periodLabel },
      { "Métrica": "Rango de Fechas", "Detalle": options.dateRangeText || "-" },
      { "Métrica": "Fecha y Hora de Emisión", "Detalle": format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es }) },
      { "Métrica": "", "Detalle": "" },
      { "Métrica": "Variedad de Productos Vendidos", "Detalle": products.length },
      { "Métrica": "Unidades Totales Vendidas", "Detalle": totalUnits },
      { "Métrica": "Total Recaudación / Ventas ($)", "Detalle": totalRevenue },
      { "Métrica": "Costo Total de Mercadería ($)", "Detalle": totalCost },
      { "Métrica": "Ganancia Neta Estimada ($)", "Detalle": totalProfit },
      { "Métrica": "Margen Bruto Global (%)", "Detalle": `${globalMargin}%` },
      { "Métrica": "", "Detalle": "" },
      { "Métrica": "--- DESGLOSE POR CATEGORÍA ---", "Detalle": "" },
    ];

    categoryStats.forEach((data, catName) => {
      summaryData.push({
        "Métrica": `Categoría: ${catName}`,
        "Detalle": `${data.itemsCount} productos | ${data.units} unid. vendidas | Total: $${data.revenue.toLocaleString("es-CL")}`,
      });
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 32 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Período");

    // Generar archivo binario y descargar
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const safeName = `reporte_productos_vendidos_${timestamp}.xlsx`;
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

    toast.success(`Reporte de productos exportado a Excel (${products.length} productos)`);
  } catch (error: any) {
    console.error("Error al exportar productos a Excel:", error);
    toast.error(`Error al exportar a Excel: ${error?.message || "Error desconocido"}`);
  }
}

/**
 * Exporta el reporte consolidado de productos vendidos a PDF estilizado (Landscape A4)
 */
export async function exportSoldProductsToPdf(
  products: SoldProduct[],
  options: ReportProductExportOptions
) {
  try {
    if (!products || products.length === 0) {
      toast.warning("No hay productos vendidos en el período seleccionado para exportar a PDF.");
      return;
    }

    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    const dateFormatted = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

    const totalUnits = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const totalRevenue = products.reduce((acc, p) => acc + (p.totalRevenue || 0), 0);
    const totalCost = products.reduce((acc, p) => acc + (p.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const globalMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    // 1. Barra superior decorativa
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("REPORTE DE VENTAS POR PRODUCTO VENDIDO", marginX, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // Slate-300
    const subText = `Período: ${options.periodLabel}${options.dateRangeText ? ` (${options.dateRangeText})` : ""}  |  Emisión: ${dateFormatted}`;
    doc.text(subText, marginX, 18);

    doc.setFont("helvetica", "bold");
    doc.text(`Total Variedad: ${products.length} productos`, pageWidth - marginX, 15, { align: "right" });

    // 2. Tarjetas KPI
    const startY = 28;
    const boxHeight = 15;
    const availableWidth = pageWidth - marginX * 2;
    const gap = 4;
    const boxWidth = (availableWidth - gap * 4) / 5;

    const kpiBoxes = [
      { label: "PRODUCTOS DIFERENTES", value: `${products.length}` },
      { label: "UNIDADES VENDIDAS", value: `${totalUnits.toLocaleString("es-CL")}` },
      { label: "TOTAL VENTAS", value: formatCurrency(totalRevenue) },
      { label: "COSTO TOTAL", value: formatCurrency(totalCost) },
      { label: "GANANCIA TOTAL", value: `${formatCurrency(totalProfit)} (${globalMargin}%)` },
    ];

    kpiBoxes.forEach((kpi, idx) => {
      const bx = marginX + idx * (boxWidth + gap);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(bx, startY, boxWidth, boxHeight, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, bx + 3, startY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.value, bx + 3, startY + 11.5);
    });

    // 3. Tabla con autoTable
    const head = [
      [
        "#",
        "SKU",
        "Nombre del Producto",
        "Categoría",
        "Cant. Vendida",
        "Precio Unit.",
        "Total Ventas",
        "Total Costo",
        "Ganancia",
        "Margen %",
        "% Ventas",
      ],
    ];

    const body = products.map((item, idx) => [
      (idx + 1).toString(),
      item.sku || "-",
      item.name || "-",
      item.category || "-",
      (item.quantity || 0).toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalRevenue),
      formatCurrency(item.totalCost),
      formatCurrency(item.profit),
      `${item.margin}%`,
      `${item.percentageOfSales}%`,
    ]);

    const foot = [
      [
        "",
        "TOTALES",
        `${products.length} productos vendidos`,
        "-",
        `${totalUnits.toLocaleString("es-CL")}`,
        "-",
        formatCurrency(totalRevenue),
        formatCurrency(totalCost),
        formatCurrency(totalProfit),
        `${globalMargin}%`,
        "100%",
      ],
    ];

    autoTable(doc, {
      startY: startY + boxHeight + 5,
      head,
      body,
      foot,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" }, // #
        1: { cellWidth: 26, fontStyle: "bold" }, // SKU
        2: { cellWidth: "auto" }, // Nombre
        3: { cellWidth: 28 }, // Categoría
        4: { cellWidth: 22, halign: "center", fontStyle: "bold" }, // Cantidad
        5: { cellWidth: 22, halign: "right" }, // Precio Unit.
        6: { cellWidth: 24, halign: "right", fontStyle: "bold" }, // Total Ventas
        7: { cellWidth: 22, halign: "right" }, // Total Costo
        8: { cellWidth: 22, halign: "right" }, // Ganancia
        9: { cellWidth: 18, halign: "center" }, // Margen %
        10: { cellWidth: 18, halign: "center" }, // % Ventas
      },
      didDrawPage: (data) => {
        const totalPages = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Point Smart Hub | Reportería de Ventas por Producto", marginX, pageHeight - 6);
        doc.text(`Página ${currentPage} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, {
          align: "right",
        });
      },
      margin: { left: marginX, right: marginX, bottom: 12 },
    });

    const safeName = `reporte_productos_vendidos_${timestamp}.pdf`;
    doc.save(safeName);

    toast.success(`PDF de productos generado exitosamente (${products.length} productos)`);
  } catch (error: any) {
    console.error("Error al exportar productos a PDF:", error);
    toast.error(`Error al exportar a PDF: ${error?.message || "Error desconocido"}`);
  }
}
