import { useState } from "react";
import { Download, FileSpreadsheet, FileText, CheckCircle2, ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Product } from "@/types/product";
import { exportInventoryToExcel, exportInventoryToPdf } from "@/utils/inventoryExport";

interface InventoryExportMenuProps {
  allProducts: Product[];
  filteredProducts: Product[];
  selectedProducts: Product[];
  searchTerm?: string;
}

export function InventoryExportMenu({
  allProducts,
  filteredProducts,
  selectedProducts,
  searchTerm,
}: InventoryExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const hasSearch = Boolean(searchTerm && searchTerm.trim().length > 0);
  const hasSelection = selectedProducts.length > 0;

  const handleExport = async (format: "excel" | "pdf", scope: "all" | "filtered" | "selected") => {
    try {
      setIsExporting(true);

      let targetList: Product[] = [];
      let scopeTitle = "Todos los Productos";
      let filterDescription = "";

      if (scope === "selected") {
        targetList = selectedProducts;
        scopeTitle = `Productos Seleccionados (${selectedProducts.length})`;
      } else if (scope === "filtered") {
        targetList = filteredProducts;
        scopeTitle = `Resultados de Búsqueda (${filteredProducts.length})`;
        filterDescription = `Término de búsqueda: "${searchTerm}"`;
      } else {
        targetList = allProducts;
        scopeTitle = `Inventario Completo (${allProducts.length} productos)`;
      }

      if (format === "excel") {
        await exportInventoryToExcel(targetList, { scopeTitle, filterDescription });
      } else {
        await exportInventoryToPdf(targetList, { scopeTitle, filterDescription });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting || allProducts.length === 0}
          className="h-8 px-2 sm:px-3 gap-1.5 transition-all hover:border-primary/50"
          title="Exportar inventario a Excel o PDF"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          <span className="hidden sm:inline font-medium">Exportar</span>
          <span className="sm:hidden font-medium">Exportar</span>
          {hasSelection && (
            <span className="ml-0.5 px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
              {selectedProducts.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-xl">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground block">Exportar Datos de Inventario</span>
          <span className="text-[11px] font-normal">Descarga en Excel (.xlsx) o documento PDF</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Sección Excel */}
        <DropdownMenuGroup>
          <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Formato Excel (.xlsx)</span>
          </div>

          <DropdownMenuItem
            onClick={() => handleExport("excel", "all")}
            className="cursor-pointer text-xs justify-between py-1.5"
          >
            <span>Todos los productos</span>
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
              {allProducts.length}
            </span>
          </DropdownMenuItem>

          {hasSearch && (
            <DropdownMenuItem
              onClick={() => handleExport("excel", "filtered")}
              className="cursor-pointer text-xs justify-between py-1.5 text-blue-600 dark:text-blue-400 focus:text-blue-600"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="w-3 h-3 shrink-0" />
                <span className="truncate">Filtrados por búsqueda</span>
              </div>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded font-mono">
                {filteredProducts.length}
              </span>
            </DropdownMenuItem>
          )}

          {hasSelection && (
            <DropdownMenuItem
              onClick={() => handleExport("excel", "selected")}
              className="cursor-pointer text-xs justify-between py-1.5 text-primary font-medium"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Solo seleccionados</span>
              </div>
              <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded font-mono">
                {selectedProducts.length}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sección PDF */}
        <DropdownMenuGroup>
          <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <FileText className="w-3.5 h-3.5" />
            <span>Formato PDF (.pdf)</span>
          </div>

          <DropdownMenuItem
            onClick={() => handleExport("pdf", "all")}
            className="cursor-pointer text-xs justify-between py-1.5"
          >
            <span>Todos los productos</span>
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
              {allProducts.length}
            </span>
          </DropdownMenuItem>

          {hasSearch && (
            <DropdownMenuItem
              onClick={() => handleExport("pdf", "filtered")}
              className="cursor-pointer text-xs justify-between py-1.5 text-blue-600 dark:text-blue-400 focus:text-blue-600"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="w-3 h-3 shrink-0" />
                <span className="truncate">Filtrados por búsqueda</span>
              </div>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded font-mono">
                {filteredProducts.length}
              </span>
            </DropdownMenuItem>
          )}

          {hasSelection && (
            <DropdownMenuItem
              onClick={() => handleExport("pdf", "selected")}
              className="cursor-pointer text-xs justify-between py-1.5 text-primary font-medium"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Solo seleccionados</span>
              </div>
              <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded font-mono">
                {selectedProducts.length}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
