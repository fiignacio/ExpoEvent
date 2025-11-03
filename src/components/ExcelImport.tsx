import { useState } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Product } from "@/types/product";

interface ExcelImportProps {
  onImport: (products: Omit<Product, "id">[]) => void;
}

export function ExcelImport({ onImport }: ExcelImportProps) {
  const [open, setOpen] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        nombre: "Café Americano",
        sku: "BEB-001",
        categoria: "Bebidas",
        stock: 100,
        precio: 5.0,
        costo: 2.5,
        promo_tipo: "bulk",
        promo_cantidad: 3,
        promo_precio: 12.0,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
    toast.success("Plantilla descargada");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const products: Omit<Product, "id">[] = jsonData.map((row: any) => {
          const product: Omit<Product, "id"> = {
            name: row.nombre || row.name,
            sku: row.sku || "",
            category: row.categoria || row.category || "Sin categoría",
            stock: Number(row.stock) || 0,
            price: Number(row.precio || row.price) || 0,
            cost: Number(row.costo || row.cost) || 0,
          };

          if (row.promo_tipo) {
            product.promotion = {
              type: row.promo_tipo,
              quantity: Number(row.promo_cantidad),
              discountedPrice: Number(row.promo_precio),
            };
          }

          return product;
        });

        onImport(products);
        toast.success(`${products.length} productos importados`);
        setOpen(false);
      } catch (error) {
        toast.error("Error al procesar el archivo");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Productos desde Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Sube un archivo Excel con tus productos
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild variant="default">
                <span>Seleccionar Archivo</span>
              </Button>
            </label>
          </div>
          <Button variant="outline" className="w-full" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Descargar Plantilla
          </Button>
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold">Columnas requeridas:</p>
            <p>• nombre, sku, categoria, stock, precio, costo</p>
            <p className="font-semibold mt-2">Columnas opcionales (promociones):</p>
            <p>• promo_tipo (bulk/percentage/fixed)</p>
            <p>• promo_cantidad (ej: 3 para "3 x 10000")</p>
            <p>• promo_precio (precio total para la cantidad)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
