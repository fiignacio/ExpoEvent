import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, DollarSign, Package, Receipt, CheckSquare, Calendar, X, PackagePlus, RefreshCw, Download, List, LayoutGrid, Copy, MessageCircle } from "lucide-react";
import { RefreshButton } from "@/components/RefreshButton";
import {
  useCustomers,
  useCustomerProducts,
  useCustomerTransactions,
  Customer,
} from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { BulkProductSelector } from "@/components/BulkProductSelector";
import { exportCustomerSalesReport } from "@/utils/customerReportExport";

import { useToast } from "@/hooks/use-toast";

// Componente de confirmación para eliminar producto
function DeleteProductConfirmDialog({ 
  productName, 
  onConfirm 
}: { 
  productName: string; 
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar producto vinculado?</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas desvincular <strong>{productName}</strong>? 
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Customers() {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer, refresh: refreshCustomers } = useCustomers();
  const { products: allProducts, refresh: refreshProducts } = useProducts();

  const handleRefresh = async () => {
    await Promise.all([refreshCustomers(), refreshProducts()]);
  };
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "cliente" as "cliente" | "proveedor",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && selectedCustomer) {
      await updateCustomer(selectedCustomer.id, formData);
    } else {
      await addCustomer(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "cliente",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    setIsEditMode(false);
    setSelectedCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      type: customer.type,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 pb-24 md:pb-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Clientes y Proveedores</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Gestiona clientes, proveedores y sus transacciones
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <RefreshButton onRefresh={handleRefresh} showText />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} size="sm" className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                <span className="sm:hidden">Nuevo</span>
                <span className="hidden sm:inline">Nuevo Cliente/Proveedor</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {isEditMode ? "Editar" : "Nuevo"} Cliente/Proveedor
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "cliente" | "proveedor") =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="proveedor">Proveedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {isEditMode ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="list" className="text-xs sm:text-sm">Lista</TabsTrigger>
            <TabsTrigger value="debts" className="text-xs sm:text-sm">Deudas Pendientes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Clientes y Proveedores</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 pt-0">
              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-2 p-2">
                {customers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay clientes</p>
                ) : (
                  customers.map((customer) => (
                    <Card 
                      key={customer.id} 
                      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{customer.name}</p>
                            <Badge
                              variant={customer.type === "cliente" ? "default" : "secondary"}
                              className="text-[10px] shrink-0"
                            >
                              {customer.type === "cliente" ? "Cliente" : "Proveedor"}
                            </Badge>
                          </div>
                          {(customer.email || customer.phone) && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {customer.email || customer.phone}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(customer)}
                            className="h-8 w-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de eliminar a {customer.name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteCustomer(customer.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Nombre</TableHead>
                      <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                      <TableHead className="text-xs sm:text-sm">Email</TableHead>
                      <TableHead className="text-xs sm:text-sm">Teléfono</TableHead>
                      <TableHead className="text-xs sm:text-sm">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                          {customer.name}
                        </TableCell>
                        <TableCell className="py-2 sm:py-4">
                          <Badge
                            variant={customer.type === "cliente" ? "default" : "secondary"}
                            className="text-[10px] sm:text-xs"
                          >
                            {customer.type === "cliente" ? "Cliente" : "Proveedor"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                          {customer.email || "-"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                          {customer.phone || "-"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="py-2 sm:py-4">
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(customer)}
                              className="h-7 w-7 sm:h-8 sm:w-8"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteCustomer(customer.id)}
                              className="h-7 w-7 sm:h-8 sm:w-8"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debts">
          <DebtsSummary customers={customers} />
        </TabsContent>
      </Tabs>

      {selectedCustomer && (
        <CustomerDetail
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          allProducts={allProducts}
        />
      )}
    </div>
  );
}

function CustomerDetail({
  customer,
  onClose,
  allProducts,
}: {
  customer: Customer;
  onClose: () => void;
  allProducts: any[];
}) {
  const { products, addProduct, addMultipleProducts, removeProduct, updateProductPrice } = useCustomerProducts(customer.id);
  const { transactions, addTransaction, updateTransaction, markAsPaid, markMultipleAsPaid, deleteTransaction, deleteMultipleTransactions, getBalance } =
    useCustomerTransactions(customer.id);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const { toast } = useToast();
  const [debtFromProductsDialogOpen, setDebtFromProductsDialogOpen] = useState(false);
  const [editTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"debt" | "payment">("debt");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [selectedProductsForDebt, setSelectedProductsForDebt] = useState<Map<string, { price: number; quantity: number; productId: string; productName: string }>>(new Map());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportReport = async () => {
    setIsExporting(true);
    await exportCustomerSalesReport(
      customer, 
      products, 
      reportStartDate || undefined, 
      reportEndDate || undefined
    );
    setIsExporting(false);
    setReportDialogOpen(false);
  };

  const existingProductIds = products.map((p) => p.product_id);

  const handleAddMultipleProducts = async (productsToAdd: { id: string; name: string; price: number }[]) => {
    await addMultipleProducts(productsToAdd.map((p) => ({ id: p.id, price: p.price })), customer.type === 'proveedor');
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTransaction(transactionType, Number(transactionAmount), transactionDescription);
    setTransactionDialogOpen(false);
    setTransactionAmount("");
    setTransactionDescription("");
  };

  const handleToggleProductForDebt = (productId: string, productName: string, price: number, checked: boolean) => {
    const newSelected = new Map(selectedProductsForDebt);
    if (checked) {
      newSelected.set(productId, { price, quantity: 1, productId, productName });
    } else {
      newSelected.delete(productId);
    }
    setSelectedProductsForDebt(newSelected);
  };

  const handleQuantityChange = (productId: string, productName: string, price: number, quantity: number) => {
    const newSelected = new Map(selectedProductsForDebt);
    newSelected.set(productId, { price, quantity, productId, productName });
    setSelectedProductsForDebt(newSelected);
  };

  const handleSelectAllProductsForDebt = (checked: boolean) => {
    if (checked) {
      const newSelected = new Map<string, { price: number; quantity: number; productId: string; productName: string }>();
      products.forEach((p) => {
        newSelected.set(p.id, { 
          price: Number(p.price), 
          quantity: 1, 
          productId: p.product_id, 
          productName: p.product?.name || 'Producto'
        });
      });
      setSelectedProductsForDebt(newSelected);
    } else {
      setSelectedProductsForDebt(new Map());
    }
  };

  const selectedProductsTotal = Array.from(selectedProductsForDebt.values()).reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setTransactionAmount(String(transaction.amount));
    setTransactionDescription(transaction.description || "");
    setTransactionType(transaction.type);
    setEditTransactionDialogOpen(true);
  };

  const handleSaveEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    
    await updateTransaction(editingTransaction.id, {
      amount: Number(transactionAmount),
      description: transactionDescription,
      type: transactionType,
    });
    
    setEditTransactionDialogOpen(false);
    setEditingTransaction(null);
    setTransactionAmount("");
    setTransactionDescription("");
  };

  const handleCreateDebtFromProducts = async () => {
    if (selectedProductsForDebt.size === 0) return;
    
    const productItems = Array.from(selectedProductsForDebt.values()).map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      productName: item.productName,
    }));
    
    const productNames = productItems.map(p => `${p.quantity}x ${p.productName}`).join(", ");
    const description = `Deuda por productos: ${productNames}`;
    
    await addTransaction("debt", selectedProductsTotal, description, productItems);
    
    setSelectedProductsForDebt(new Map());
    setDebtFromProductsDialogOpen(false);
  };

  const balance = getBalance();
  
  const filteredPendingTransactions = transactions.filter((t) => {
    if (t.status !== "pending") return false;
    if (!startDate && !endDate) return true;
    
    const transactionDate = new Date(t.created_at);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && end) {
      return transactionDate >= start && transactionDate <= end;
    } else if (start) {
      return transactionDate >= start;
    } else if (end) {
      return transactionDate <= end;
    }
    return true;
  });
  
  const paidTransactions = transactions.filter((t) => t.status === "paid");

  const handleSelectTransaction = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactions([...selectedTransactions, id]);
    } else {
      setSelectedTransactions(selectedTransactions.filter((tid) => tid !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(filteredPendingTransactions.map((t) => t.id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handlePaySelected = async () => {
    if (selectedTransactions.length === 0) return;
    await markMultipleAsPaid(selectedTransactions);
    setSelectedTransactions([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.length === 0) return;
    await deleteMultipleTransactions(selectedTransactions);
    setSelectedTransactions([]);
  };

  const selectedTotal = filteredPendingTransactions
    .filter((t) => selectedTransactions.includes(t.id))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Group pending debt transactions to group by product
  const groupedProducts = useMemo(() => {
    const productSummary = new Map<string, { name: string; price: number; quantity: number }>();
    
    filteredPendingTransactions.forEach((t) => {
      if (t.type !== "debt" || !t.description) return;
      const matches = t.description.match(/(\d+)x\s+([^,]+)/g);
      if (matches) {
        // Calculate total qty in this transaction to derive unit price from amount
        let totalQtyInTransaction = 0;
        const parsedItems: { qty: number; name: string }[] = [];
        matches.forEach((match) => {
          const parts = match.match(/(\d+)x\s+(.+)/);
          if (parts) {
            const qty = parseInt(parts[1]);
            totalQtyInTransaction += qty;
            parsedItems.push({ qty, name: parts[2].trim() });
          }
        });

        parsedItems.forEach((item) => {
          const nameKey = item.name.toUpperCase();
          const existing = productSummary.get(nameKey);
          // Try to get price from customer_products (case-insensitive)
          const customerProduct = products.find(
            (p) => p.product?.name?.toUpperCase() === nameKey
          );
          // Use customer product price, or derive from transaction amount
          let unitPrice = customerProduct ? Number(customerProduct.price) : 0;
          if (!unitPrice && parsedItems.length === 1 && item.qty > 0) {
            unitPrice = Number(t.amount) / item.qty;
          }

          if (existing) {
            productSummary.set(nameKey, {
              name: item.name,
              price: existing.price || unitPrice,
              quantity: existing.quantity + item.qty,
            });
          } else {
            productSummary.set(nameKey, { name: item.name, price: unitPrice, quantity: item.qty });
          }
        });
      }
    });
    return Array.from(productSummary.values());
  }, [filteredPendingTransactions, products]);

  const groupedTotal = useMemo(() => 
    groupedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)
  , [groupedProducts]);

  const getSummaryText = () => {
    let text = `Resumen de productos - ${customer.name}\n`;
    text += `--------------------------\n`;
    groupedProducts.forEach(item => {
      text += `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toLocaleString()}\n`;
    });
    text += `--------------------------\n`;
    text += `Total: $${groupedTotal.toLocaleString()}`;
    return text;
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(getSummaryText());
    toast({
      title: "Copiado",
      description: "El resumen se ha copiado al portapapeles",
    });
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getSummaryText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <Card className="mt-4">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl">{customer.name}</CardTitle>
            <Badge variant={customer.type === "cliente" ? "default" : "secondary"} className="mt-1 text-xs">
              {customer.type === "cliente" ? "Cliente" : "Proveedor"}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-2 sm:hidden" />
            Cerrar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        <Tabs defaultValue="products">
          <div className="overflow-x-auto pb-2">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="products" className="text-xs sm:text-sm">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Productos</span>
                <span className="sm:hidden">Prod.</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs sm:text-sm">
                <Receipt className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Transacciones</span>
                <span className="sm:hidden">Trans.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold">Productos vinculados</h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                <Dialog open={debtFromProductsDialogOpen} onOpenChange={setDebtFromProductsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={products.length === 0} className="flex-1 sm:flex-none h-8 text-xs sm:text-sm px-2 sm:px-3">
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Registrar Deuda</span>
                      <span className="sm:hidden">Deuda</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                      <DialogTitle>Registrar Deuda por Productos</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-4">
                      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all-products"
                            checked={selectedProductsForDebt.size === products.length && products.length > 0}
                            onCheckedChange={handleSelectAllProductsForDebt}
                          />
                          <Label htmlFor="select-all-products" className="text-sm cursor-pointer">
                            Seleccionar todos ({products.length})
                          </Label>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total seleccionado:</p>
                          <p className="font-bold text-lg">${selectedProductsTotal.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead>Precio Unit.</TableHead>
                              <TableHead>Cantidad</TableHead>
                              <TableHead>Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((product) => {
                              const selectedItem = selectedProductsForDebt.get(product.id);
                              const isSelected = !!selectedItem;
                              const basePrice = Number(product.price);
                              const quantity = selectedItem?.quantity || 1;
                              const subtotal = isSelected ? basePrice * quantity : basePrice;
                              
                              return (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => 
                                        handleToggleProductForDebt(product.id, product.product?.name || 'Producto', basePrice, !!checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>{product.product?.name}</TableCell>
                                  <TableCell>${basePrice.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={quantity}
                                      onChange={(e) => 
                                        handleQuantityChange(product.id, product.product?.name || 'Producto', basePrice, Number(e.target.value) || 1)
                                      }
                                      className="w-20 h-8"
                                      disabled={!isSelected}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    ${subtotal.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setDebtFromProductsDialogOpen(false);
                            setSelectedProductsForDebt(new Map());
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateDebtFromProducts}
                          disabled={selectedProductsForDebt.size === 0}
                        >
                          Registrar Deuda de ${selectedProductsTotal.toFixed(2)}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex-1 sm:flex-none h-8 text-xs sm:text-sm px-2 sm:px-3">
                      <PackagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Vincular Productos</span>
                      <span className="sm:hidden">Vincular</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader className="flex-shrink-0">
                      <DialogTitle>Vincular Productos</DialogTitle>
                    </DialogHeader>
                    <BulkProductSelector
                      products={allProducts}
                      existingProductIds={existingProductIds}
                      onAddProducts={handleAddMultipleProducts}
                      onClose={() => setProductDialogOpen(false)}
                      isSupplier={customer.type === 'proveedor'}
                    />
                  </DialogContent>
                </Dialog>
                <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={products.length === 0} className="flex-1 sm:flex-none h-8 text-xs sm:text-sm px-2 sm:px-3">
                      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Exportar</span>
                      <span className="sm:hidden">Export</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Exportar Reporte de Ventas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Genera un reporte detallado con todas las ventas de productos vinculados a {customer.name}.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="report-start">Fecha Inicio</Label>
                          <Input
                            id="report-start"
                            type="date"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="report-end">Fecha Fin</Label>
                          <Input
                            id="report-end"
                            type="date"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Si no seleccionas fechas, se exportarán los últimos 30 días.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setReportDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleExportReport}
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Exportando...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar Excel
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>{customer.type === 'proveedor' ? 'Monto por Venta' : 'Precio'}</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No hay productos vinculados
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.product?.name}</TableCell>
                        <TableCell>{product.product?.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>$</span>
                            <Input
                              type="number"
                              className="w-24 h-8"
                              defaultValue={Number(product.price)}
                              onBlur={(e) => {
                                const newPrice = Number(e.target.value);
                                if (newPrice !== Number(product.price)) {
                                  updateProductPrice(product.id, newPrice);
                                }
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <DeleteProductConfirmDialog
                            productName={product.product?.name || 'Producto'}
                            onConfirm={() => removeProduct(product.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {products.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No hay productos vinculados
                </div>
              ) : (
                products.map((product) => (
                  <Card key={product.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-medium text-sm truncate">{product.product?.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {product.product?.sku}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {customer.type === 'proveedor' ? 'Monto:' : 'Precio:'}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-xs">$</span>
                            <Input
                              type="number"
                              className="w-20 h-7 text-xs"
                              defaultValue={Number(product.price)}
                              onBlur={(e) => {
                                const newPrice = Number(e.target.value);
                                if (newPrice !== Number(product.price)) {
                                  updateProductPrice(product.id, newPrice);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <DeleteProductConfirmDialog
                        productName={product.product?.name || 'Producto'}
                        onConfirm={() => removeProduct(product.id)}
                      />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Balance Pendiente</h3>
                    <p className={`text-3xl font-bold ${balance > 0 ? "text-destructive" : "text-green-500"}`}>
                      ${balance.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filteredPendingTransactions.length} transacciones pendientes
                    </p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Dialog
                      open={transactionDialogOpen}
                      onOpenChange={setTransactionDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Nueva Transacción
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle>Nueva Transacción</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                              value={transactionType}
                              onValueChange={(value: "debt" | "payment") =>
                                setTransactionType(value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="debt">Deuda</SelectItem>
                                <SelectItem value="payment">Pago</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Monto</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={transactionAmount}
                              onChange={(e) => setTransactionAmount(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea
                              value={transactionDescription}
                              onChange={(e) => setTransactionDescription(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setTransactionDialogOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button type="submit">Registrar</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen agrupado por producto */}
            {groupedProducts.length > 0 && (
              <Card className="border-dashed">
                <CardHeader className="p-3 sm:p-6 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        Resumen por Producto
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Detalle agrupado de deudas pendientes por producto
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={handleCopySummary}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copiar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-200 dark:border-green-900"
                        onClick={handleShareWhatsApp}
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                        WhatsApp
                      </Button>
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                        {groupedProducts.length} producto(s)
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  {/* Mobile view */}
                  <div className="lg:hidden space-y-2">
                    {groupedProducts.map((item) => (
                      <Card key={item.name} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>Precio: ${item.price.toLocaleString()}</span>
                              <span>×</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {item.quantity}
                              </Badge>
                            </div>
                          </div>
                          <p className="font-bold text-sm shrink-0">
                            ${(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </Card>
                    ))}
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg font-bold text-sm">
                      <span>Total</span>
                      <span>${groupedTotal.toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Desktop view */}
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Precio Unitario</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedProducts.map((item) => (
                          <TableRow key={item.name}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>${item.price.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.quantity}</Badge>
                            </TableCell>
                            <TableCell className="font-bold">
                              ${(item.price * item.quantity).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={3}>Total Agrupado</TableCell>
                          <TableCell className="font-bold">
                            ${groupedTotal.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col gap-3">
                  <CardTitle className="text-base sm:text-lg">Transacciones Pendientes</CardTitle>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Calendar className="w-4 h-4 shrink-0 hidden sm:block" />
                    <Input
                      type="date"
                      placeholder="Desde"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-32 h-8 text-xs"
                    />
                    <span className="text-muted-foreground hidden sm:inline">-</span>
                    <Input
                      type="date"
                      placeholder="Hasta"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full sm:w-32 h-8 text-xs"
                    />
                    {(startDate || endDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="h-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0 space-y-4">
                {selectedTransactions.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 space-y-2">
                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="font-semibold text-sm">
                          {selectedTransactions.length} seleccionadas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total: ${selectedTotal.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransactions([])}
                          className="h-8 text-xs"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteSelected}
                          className="h-8 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Eliminar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handlePaySelected}
                          className="h-8 text-xs"
                        >
                          <CheckSquare className="w-3 h-3 mr-1" />
                          Pagado
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Mobile/Tablet Card View for Transactions */}
                <div className="lg:hidden space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox
                      checked={selectedTransactions.length === filteredPendingTransactions.length && filteredPendingTransactions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-xs text-muted-foreground">Seleccionar todas</span>
                  </div>
                  {filteredPendingTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No hay transacciones pendientes
                    </p>
                  ) : (
                    filteredPendingTransactions.map((transaction) => {
                      const isPendingSale = transaction.description?.startsWith("Venta pendiente:");
                      return (
                        <Card key={transaction.id} className={`p-3 ${isPendingSale ? "bg-warning/5" : ""}`}>
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={selectedTransactions.includes(transaction.id)}
                              onCheckedChange={(checked) =>
                                handleSelectTransaction(transaction.id, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {isPendingSale ? (
                                      <Badge variant="destructive" className="text-[10px]">
                                        Venta Pendiente
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant={transaction.type === "debt" ? "destructive" : "default"}
                                        className="text-[10px]"
                                      >
                                        {transaction.type === "debt" ? "Deuda" : "Pago"}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(transaction.created_at).toLocaleDateString()}{" "}
                                    {new Date(transaction.created_at).toLocaleTimeString()}
                                  </p>
                                </div>
                                <p className="font-bold text-destructive text-sm shrink-0">
                                  ${Number(transaction.amount).toFixed(2)}
                                </p>
                              </div>
                              {transaction.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {transaction.description}
                                </p>
                              )}
                              <div className="flex gap-1 pt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditTransaction(transaction)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsPaid(transaction.id)}
                                  className="h-7 text-xs flex-1"
                                >
                                  <CheckSquare className="w-3 h-3 mr-1" />
                                  Pagado
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteTransaction(transaction.id)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table View for Transactions */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedTransactions.length === filteredPendingTransactions.length && filteredPendingTransactions.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Detalle</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPendingTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No hay transacciones pendientes
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPendingTransactions.map((transaction) => {
                          const isPendingSale = transaction.description?.startsWith("Venta pendiente:");
                          return (
                            <TableRow key={transaction.id} className={isPendingSale ? "bg-warning/5" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedTransactions.includes(transaction.id)}
                                  onCheckedChange={(checked) =>
                                    handleSelectTransaction(transaction.id, checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm">
                                    {new Date(transaction.created_at).toLocaleDateString()}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(transaction.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {isPendingSale ? (
                                    <>
                                      <Badge variant="destructive" className="w-fit">
                                        Venta Pendiente
                                      </Badge>
                                      <Badge variant="outline" className="w-fit text-xs">
                                        Sin pagar
                                      </Badge>
                                    </>
                                  ) : (
                                    <Badge
                                      variant={
                                        transaction.type === "debt" ? "destructive" : "default"
                                      }
                                    >
                                      {transaction.type === "debt" ? "Deuda" : "Pago"}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="text-sm">
                                  {transaction.description || "-"}
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-destructive">
                                ${Number(transaction.amount).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditTransaction(transaction)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markAsPaid(transaction.id)}
                                    className="whitespace-nowrap"
                                  >
                                    <CheckSquare className="w-4 h-4 mr-1" />
                                    Pagado
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteTransaction(transaction.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Historial de Pagos</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                {/* Mobile/Tablet Card View for Payment History */}
                <div className="lg:hidden space-y-2">
                  {paidTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No hay pagos registrados
                    </p>
                  ) : (
                    paidTransactions.map((transaction) => {
                      const createdDate = new Date(transaction.created_at);
                      const paidDate = transaction.paid_at ? new Date(transaction.paid_at) : null;
                      const daysToPay = paidDate 
                        ? Math.ceil((paidDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                        : 0;
                      const isPendingSale = transaction.description?.startsWith("Venta pendiente:");
                      
                      return (
                        <Card key={transaction.id} className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col gap-1">
                                {isPendingSale ? (
                                  <Badge variant="outline" className="w-fit bg-green-50 text-[10px]">
                                    Venta Pagada
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">
                                    {transaction.type === "debt" ? "Deuda Pagada" : "Pago"}
                                  </Badge>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Creado: {createdDate.toLocaleDateString()}
                                </p>
                                {paidDate && (
                                  <p className="text-xs text-green-600 font-medium">
                                    Pagado: {paidDate.toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-green-600 text-sm">
                                  ${Number(transaction.amount).toFixed(2)}
                                </p>
                                {daysToPay > 0 ? (
                                  <Badge variant="secondary" className="text-[10px] mt-1">
                                    {daysToPay} {daysToPay === 1 ? "día" : "días"}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Mismo día</span>
                                )}
                              </div>
                            </div>
                            {transaction.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {transaction.description}
                              </p>
                            )}
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table View for Payment History */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha Venta/Deuda</TableHead>
                        <TableHead>Fecha Pago</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Detalle</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Días hasta Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No hay pagos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        paidTransactions.map((transaction) => {
                          const createdDate = new Date(transaction.created_at);
                          const paidDate = transaction.paid_at ? new Date(transaction.paid_at) : null;
                          const daysToPay = paidDate 
                            ? Math.ceil((paidDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                            : 0;
                          const isPendingSale = transaction.description?.startsWith("Venta pendiente:");
                          
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm">
                                    {createdDate.toLocaleDateString()}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {createdDate.toLocaleTimeString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {paidDate ? (
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-green-600">
                                      {paidDate.toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {paidDate.toLocaleTimeString()}
                                    </span>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {isPendingSale ? (
                                    <Badge variant="outline" className="w-fit bg-green-50">
                                      Venta Pagada
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">
                                      {transaction.type === "debt" ? "Deuda Pagada" : "Pago"}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="text-sm">
                                  {transaction.description || "-"}
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                ${Number(transaction.amount).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {daysToPay > 0 ? (
                                  <Badge variant="secondary">
                                    {daysToPay} {daysToPay === 1 ? "día" : "días"}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Mismo día</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Diálogo de edición de transacción */}
        <Dialog open={editTransactionDialogOpen} onOpenChange={setEditTransactionDialogOpen}>
          <DialogContent className="max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Editar Transacción</DialogTitle>
              <DialogDescription>
                Modifica los datos de la transacción
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEditTransaction} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={transactionType}
                  onValueChange={(value: "debt" | "payment") =>
                    setTransactionType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debt">Deuda</SelectItem>
                    <SelectItem value="payment">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditTransactionDialogOpen(false);
                    setEditingTransaction(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar Cambios</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function DebtsSummary({ customers }: { customers: Customer[] }) {
  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Resumen de Deudas</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden space-y-2">
          {customers.map((customer) => (
            <DebtCardRow key={customer.id} customer={customer} />
          ))}
        </div>
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente/Proveedor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Pendientes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <DebtRow key={customer.id} customer={customer} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function DebtCardRow({ customer }: { customer: Customer }) {
  const { getBalance, transactions } = useCustomerTransactions(customer.id);
  const balance = getBalance();
  const pendingCount = transactions.filter((t) => t.status === "pending").length;

  if (balance === 0) return null;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{customer.name}</p>
            <Badge
              variant={customer.type === "cliente" ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {customer.type === "cliente" ? "Cliente" : "Proveedor"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
          </p>
        </div>
        <p className={`font-bold text-sm shrink-0 ${balance > 0 ? "text-destructive" : "text-green-500"}`}>
          ${balance.toFixed(2)}
        </p>
      </div>
    </Card>
  );
}

function DebtRow({ customer }: { customer: Customer }) {
  const { getBalance, transactions } = useCustomerTransactions(customer.id);
  const balance = getBalance();
  const pendingCount = transactions.filter((t) => t.status === "pending").length;

  if (balance === 0) return null;

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell>
        <Badge
          variant={customer.type === "cliente" ? "default" : "secondary"}
        >
          {customer.type === "cliente" ? "Cliente" : "Proveedor"}
        </Badge>
      </TableCell>
      <TableCell className={`font-semibold ${balance > 0 ? "text-destructive" : "text-green-500"}`}>
        ${balance.toFixed(2)}
      </TableCell>
      <TableCell>{pendingCount}</TableCell>
    </TableRow>
  );
}
