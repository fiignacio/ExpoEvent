import * as XLSX from 'xlsx';
import { format, startOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomerProduct {
  id: string;
  product_id: string;
  price: number;
  product?: {
    name: string;
    sku: string;
  };
}

interface Customer {
  id: string;
  name: string;
  type: "cliente" | "proveedor";
}

interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  originalPrice?: number;
}

export async function exportCustomerSalesReport(
  customer: Customer,
  products: CustomerProduct[],
  startDate?: string,
  endDate?: string
) {
  try {
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : subDays(end, 30);
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    // Get product IDs linked to this customer
    const linkedProductIds = products.map(p => p.product_id);
    
    if (linkedProductIds.length === 0) {
      toast.error("No hay productos vinculados a este cliente/proveedor");
      return;
    }

    // Create a map of product_id to customer product info
    const productInfoMap = new Map(products.map(p => [
      p.product_id, 
      { 
        price: p.price, 
        name: p.product?.name || 'Producto desconocido',
        sku: p.product?.sku || 'N/A'
      }
    ]));

    // Fetch all sales in the period
    const { data: sales, error: salesError } = await supabase
      .from('offline_sales')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (salesError) throw salesError;

    // Process sales to find items matching linked products
    const salesDetails: any[] = [];
    let totalQuantity = 0;
    let totalAmount = 0;
    let totalSaleValue = 0;

    sales?.forEach(sale => {
      const items = Array.isArray(sale.items) ? (sale.items as unknown as SaleItem[]) : [];
      
      items.forEach((item: SaleItem) => {
        // Check if this product is linked to the customer
        const productId = item.productId;
        const productInfo = productInfoMap.get(productId);
        
        if (productInfo) {
          const quantity = item.quantity || 1;
          const salePrice = item.price || 0;
          const commissionAmount = productInfo.price * quantity;
          const saleTotal = salePrice * quantity;
          
          salesDetails.push({
            fecha: format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: es }),
            hora: format(new Date(sale.created_at), 'HH:mm:ss', { locale: es }),
            producto: productInfo.name,
            sku: productInfo.sku,
            cantidad: quantity,
            precioVenta: salePrice,
            totalVenta: saleTotal,
            comisionUnitaria: productInfo.price,
            montoCliente: commissionAmount,
            metodoPago: sale.payment_method || 'N/A',
            ventaId: sale.id.substring(0, 8)
          });
          
          totalQuantity += quantity;
          totalAmount += commissionAmount;
          totalSaleValue += saleTotal;
        }
      });
    });

    if (salesDetails.length === 0) {
      toast.info("No se encontraron ventas de productos vinculados en el período seleccionado");
      return;
    }

    // Get transactions for this customer
    const { data: transactions, error: txError } = await supabase
      .from('customer_transactions')
      .select('*')
      .eq('customer_id', customer.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (txError) throw txError;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      { Campo: customer.type === 'proveedor' ? 'Proveedor' : 'Cliente', Valor: customer.name },
      { Campo: 'Período', Valor: `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}` },
      { Campo: 'Fecha de Generación', Valor: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es }) },
      { Campo: '', Valor: '' },
      { Campo: 'Productos Vinculados', Valor: products.length },
      { Campo: 'Total Productos Vendidos', Valor: totalQuantity },
      { Campo: 'Valor Total Ventas', Valor: `$${totalSaleValue.toFixed(2)}` },
      { Campo: customer.type === 'proveedor' ? 'Total Comisión/Deuda' : 'Total a Cobrar', Valor: `$${totalAmount.toFixed(2)}` },
      { Campo: '', Valor: '' },
      { Campo: 'Transacciones Registradas', Valor: transactions?.length || 0 },
      { Campo: 'Pagos Realizados', Valor: transactions?.filter(t => t.status === 'paid').length || 0 },
      { Campo: 'Pendientes', Valor: transactions?.filter(t => t.status === 'pending').length || 0 },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Detailed sales sheet
    const detailedData = salesDetails.map(s => ({
      'Fecha': s.fecha,
      'Hora': s.hora,
      'Producto': s.producto,
      'SKU': s.sku,
      'Cantidad': s.cantidad,
      'Precio Venta': `$${s.precioVenta.toFixed(2)}`,
      'Total Venta': `$${s.totalVenta.toFixed(2)}`,
      'Comisión/Monto Unit.': `$${s.comisionUnitaria.toFixed(2)}`,
      'Monto Cliente': `$${s.montoCliente.toFixed(2)}`,
      'Método Pago': s.metodoPago,
      'ID Venta': s.ventaId
    }));
    const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetailed, 'Ventas Detalladas');

    // Products summary sheet
    const productsSummary = new Map<string, { name: string; sku: string; quantity: number; salesTotal: number; commission: number }>();
    
    salesDetails.forEach(s => {
      const existing = productsSummary.get(s.sku) || { 
        name: s.producto, 
        sku: s.sku, 
        quantity: 0, 
        salesTotal: 0, 
        commission: 0 
      };
      existing.quantity += s.cantidad;
      existing.salesTotal += s.totalVenta;
      existing.commission += s.montoCliente;
      productsSummary.set(s.sku, existing);
    });

    const productsSummaryData = Array.from(productsSummary.values()).map(p => ({
      'Producto': p.name,
      'SKU': p.sku,
      'Total Cantidad': p.quantity,
      'Total Ventas': `$${p.salesTotal.toFixed(2)}`,
      'Total Comisión': `$${p.commission.toFixed(2)}`
    }));
    const wsProductsSummary = XLSX.utils.json_to_sheet(productsSummaryData);
    XLSX.utils.book_append_sheet(wb, wsProductsSummary, 'Resumen por Producto');

    // Daily summary sheet
    const dailySummary = new Map<string, { quantity: number; salesTotal: number; commission: number }>();
    
    salesDetails.forEach(s => {
      const existing = dailySummary.get(s.fecha) || { quantity: 0, salesTotal: 0, commission: 0 };
      existing.quantity += s.cantidad;
      existing.salesTotal += s.totalVenta;
      existing.commission += s.montoCliente;
      dailySummary.set(s.fecha, existing);
    });

    const dailySummaryData = Array.from(dailySummary.entries()).map(([date, data]) => ({
      'Fecha': date,
      'Productos Vendidos': data.quantity,
      'Total Ventas': `$${data.salesTotal.toFixed(2)}`,
      'Total Comisión': `$${data.commission.toFixed(2)}`
    }));
    const wsDailySummary = XLSX.utils.json_to_sheet(dailySummaryData);
    XLSX.utils.book_append_sheet(wb, wsDailySummary, 'Resumen Diario');

    // Transactions sheet
    if (transactions && transactions.length > 0) {
      const txData = transactions.map(t => ({
        'Fecha': format(new Date(t.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
        'Tipo': t.type === 'debt' ? 'Deuda' : 'Pago',
        'Monto': `$${Number(t.amount).toFixed(2)}`,
        'Estado': t.status === 'paid' ? 'Pagado' : 'Pendiente',
        'Descripción': t.description || '-',
        'Fecha Pago': t.paid_at ? format(new Date(t.paid_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '-'
      }));
      const wsTx = XLSX.utils.json_to_sheet(txData);
      XLSX.utils.book_append_sheet(wb, wsTx, 'Transacciones');
    }

    // Linked products sheet
    const linkedProductsData = products.map(p => ({
      'Producto': p.product?.name || 'N/A',
      'SKU': p.product?.sku || 'N/A',
      'Comisión/Monto por Unidad': `$${Number(p.price).toFixed(2)}`
    }));
    const wsLinkedProducts = XLSX.utils.json_to_sheet(linkedProductsData);
    XLSX.utils.book_append_sheet(wb, wsLinkedProducts, 'Productos Vinculados');

    // Generate file
    const fileName = `reporte_${customer.type}_${customer.name.replace(/\s+/g, '_')}_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success("Reporte exportado correctamente");
  } catch (error: any) {
    console.error("Error exporting customer report:", error);
    toast.error("Error al exportar el reporte: " + (error.message || "Error desconocido"));
  }
}
