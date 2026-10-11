import { useState, useMemo } from "react";
import { Search, Download, FileSpreadsheet, FileText, ArrowUpDown, Tag, Package, DollarSign, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SoldProduct } from "@/hooks/useReports";
import { exportSoldProductsToExcel, exportSoldProductsToPdf } from "@/utils/reportsProductExport";

interface SoldProductsReportTableProps {
  products: SoldProduct[];
  loading: boolean;
  periodLabel: string;
  dateRangeText?: string;
}

export function SoldProductsReportTable({
  products,
  loading,
  periodLabel,
  dateRangeText,
}: SoldProductsReportTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"revenue_desc" | "qty_desc" | "margin_desc" | "name_asc">("revenue_desc");

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtrar y ordenar
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || p.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });

    switch (sortBy) {
      case "revenue_desc":
        result.sort((a, b) => b.totalRevenue - a.totalRevenue);
        break;
      case "qty_desc":
        result.sort((a, b) => b.quantity - a.quantity);
        break;
      case "margin_desc":
        result.sort((a, b) => b.margin - a.margin);
        break;
      case "name_asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [products, searchTerm, selectedCategory, sortBy]);

  // Totales de la selección actual
  const totals = useMemo(() => {
    const totalUnits = filteredProducts.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const totalRevenue = filteredProducts.reduce((acc, p) => acc + (p.totalRevenue || 0), 0);
    const totalCost = filteredProducts.reduce((acc, p) => acc + (p.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const globalMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    return { totalUnits, totalRevenue, totalCost, totalProfit, globalMargin };
  }, [filteredProducts]);

  const handleExportExcel = () => {
    exportSoldProductsToExcel(filteredProducts, {
      periodLabel,
      dateRangeText,
    });
  };

  const handleExportPdf = () => {
    exportSoldProductsToPdf(filteredProducts, {
      periodLabel,
      dateRangeText,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Cargando consolidado de productos vendidos...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card/70">
          <CardContent className="p-3.5">
            <p className="text-xs text-muted-foreground">Variedad Vendida</p>
            <p className="text-xl font-bold mt-0.5">{filteredProducts.length} productos</p>
            <span className="text-[11px] text-muted-foreground">En este filtro</span>
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardContent className="p-3.5">
            <p className="text-xs text-muted-foreground">Unidades Totales</p>
            <p className="text-xl font-bold text-primary mt-0.5">{totals.totalUnits.toLocaleString("es-CL")}</p>
            <span className="text-[11px] text-muted-foreground">Unidades despachadas</span>
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardContent className="p-3.5">
            <p className="text-xs text-muted-foreground">Total Recaudado</p>
            <p className="text-xl font-bold text-success mt-0.5">
              ${totals.totalRevenue.toLocaleString("es-CL")}
            </p>
            <span className="text-[11px] text-muted-foreground">Ventas brutas</span>
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardContent className="p-3.5">
            <p className="text-xs text-muted-foreground">Ganancia Estimada</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ${totals.totalProfit.toLocaleString("es-CL")}
            </p>
            <span className="text-[11px] text-muted-foreground">Margen: {totals.globalMargin}%</span>
          </CardContent>
        </Card>
      </div>

      {/* Contenedor Principal de la Tabla */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span>Reporte Completo por Producto Vendido</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Consolidado detallado con cantidad de unidades, precio unitario y total facturado ({periodLabel})
              </CardDescription>
            </div>

            {/* Botones de Exportación Directos */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={filteredProducts.length === 0}
                className="h-8 gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Exportar Excel (.xlsx)</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={filteredProducts.length === 0}
                className="h-8 gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Exportar PDF (.pdf)</span>
              </Button>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Todas las Categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías ({categories.length})</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue_desc">Mayor Total Ventas ($)</SelectItem>
                <SelectItem value="qty_desc">Mayor Cantidad Vendida</SelectItem>
                <SelectItem value="margin_desc">Mayor Margen (%)</SelectItem>
                <SelectItem value="name_asc">Nombre (A - Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No se encontraron ventas para los filtros seleccionados
            </div>
          ) : (
            <>
              {/* Vista Móvil (Tarjetas) */}
              <div className="space-y-2.5 p-3 sm:hidden">
                {filteredProducts.map((item, idx) => (
                  <div key={item.sku + idx} className="border rounded-lg p-3 bg-card space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm truncate">{item.name}</span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">{item.sku}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {item.category}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-muted/40 p-2 rounded">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Vendidos</span>
                        <span className="font-bold text-primary">{item.quantity} unid.</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Precio Unit.</span>
                        <span className="font-medium">${item.unitPrice.toLocaleString("es-CL")}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Total Venta</span>
                        <span className="font-bold text-success">${item.totalRevenue.toLocaleString("es-CL")}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5">
                      <span>Ganancia: ${item.profit.toLocaleString("es-CL")} ({item.margin}%)</span>
                      <span className="font-medium">{item.percentageOfSales}% del total</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista Desktop (Tabla) */}
              <div className="hidden sm:block overflow-x-auto border-t">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="w-[45px] text-center">#</TableHead>
                      <TableHead className="w-[110px]">SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[120px]">Categoría</TableHead>
                      <TableHead className="w-[100px] text-center">Cantidad</TableHead>
                      <TableHead className="w-[110px] text-right">Precio Unit.</TableHead>
                      <TableHead className="w-[120px] text-right">Total Ventas</TableHead>
                      <TableHead className="w-[110px] text-right">Total Costo</TableHead>
                      <TableHead className="w-[110px] text-right">Ganancia</TableHead>
                      <TableHead className="w-[85px] text-center">Margen</TableHead>
                      <TableHead className="w-[85px] text-center">% Ventas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((item, idx) => (
                      <TableRow key={item.sku + idx} className="text-xs hover:bg-muted/30">
                        <TableCell className="text-center text-muted-foreground font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                        <TableCell className="font-semibold">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-primary">
                          {item.quantity.toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.unitPrice.toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          ${item.totalRevenue.toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${item.totalCost.toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          ${item.profit.toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.margin}%
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {item.percentageOfSales}%
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Fila de Totales */}
                    <TableRow className="bg-muted/70 font-bold text-xs border-t-2">
                      <TableCell colSpan={4} className="text-right">
                        TOTALES ({filteredProducts.length} productos):
                      </TableCell>
                      <TableCell className="text-center text-primary font-bold">
                        {totals.totalUnits.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-success font-bold text-sm">
                        ${totals.totalRevenue.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${totals.totalCost.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        ${totals.totalProfit.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-center">{totals.globalMargin}%</TableCell>
                      <TableCell className="text-center">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
