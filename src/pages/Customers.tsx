import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2, DollarSign, Package, Receipt, CheckSquare, Calendar, X, PackagePlus } from "lucide-react";
import {
  useCustomers,
  useCustomerProducts,
  useCustomerTransactions,
  Customer,
} from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { BulkProductSelector } from "@/components/BulkProductSelector";

export default function Customers() {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { products: allProducts } = useProducts();
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
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Clientes y Proveedores</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Gestiona clientes, proveedores y sus transacciones
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} size="sm" className="w-full sm:w-auto">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Nombre</TableHead>
                      <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Email</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Teléfono</TableHead>
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
                        <TableCell className="text-xs sm:text-sm hidden sm:table-cell py-2 sm:py-4">
                          {customer.email || "-"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden md:table-cell py-2 sm:py-4">
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
  const { transactions, addTransaction, markAsPaid, markMultipleAsPaid, deleteTransaction, deleteMultipleTransactions, getBalance } =
    useCustomerTransactions(customer.id);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [debtFromProductsDialogOpen, setDebtFromProductsDialogOpen] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"debt" | "payment">("debt");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [selectedProductsForDebt, setSelectedProductsForDebt] = useState<Map<string, number>>(new Map());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const existingProductIds = products.map((p) => p.product_id);

  const handleAddMultipleProducts = async (productsToAdd: { id: string; name: string; price: number }[]) => {
    await addMultipleProducts(productsToAdd.map((p) => ({ id: p.id, price: p.price })));
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTransaction(transactionType, Number(transactionAmount), transactionDescription);
    setTransactionDialogOpen(false);
    setTransactionAmount("");
    setTransactionDescription("");
  };

  const handleToggleProductForDebt = (productId: string, price: number, checked: boolean) => {
    const newSelected = new Map(selectedProductsForDebt);
    if (checked) {
      newSelected.set(productId, price);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProductsForDebt(newSelected);
  };

  const handleQuantityChange = (productId: string, price: number, quantity: number) => {
    const newSelected = new Map(selectedProductsForDebt);
    newSelected.set(productId, price * quantity);
    setSelectedProductsForDebt(newSelected);
  };

  const handleSelectAllProductsForDebt = (checked: boolean) => {
    if (checked) {
      const newSelected = new Map<string, number>();
      products.forEach((p) => {
        newSelected.set(p.id, Number(p.price));
      });
      setSelectedProductsForDebt(newSelected);
    } else {
      setSelectedProductsForDebt(new Map());
    }
  };

  const selectedProductsTotal = Array.from(selectedProductsForDebt.values()).reduce((sum, price) => sum + price, 0);

  const handleCreateDebtFromProducts = async () => {
    if (selectedProductsForDebt.size === 0) return;
    
    const productNames = products
      .filter((p) => selectedProductsForDebt.has(p.id))
      .map((p) => p.product?.name)
      .join(", ");
    
    const description = `Deuda por productos: ${productNames}`;
    await addTransaction("debt", selectedProductsTotal, description);
    
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
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="text-lg font-semibold">Productos vinculados</h3>
              <div className="flex gap-2">
                <Dialog open={debtFromProductsDialogOpen} onOpenChange={setDebtFromProductsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={products.length === 0}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Registrar Deuda
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
                              const isSelected = selectedProductsForDebt.has(product.id);
                              const basePrice = Number(product.price);
                              const currentTotal = selectedProductsForDebt.get(product.id) || basePrice;
                              const quantity = Math.round(currentTotal / basePrice) || 1;
                              
                              return (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => 
                                        handleToggleProductForDebt(product.id, basePrice, !!checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>{product.product?.name}</TableCell>
                                  <TableCell>${basePrice.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={isSelected ? quantity : 1}
                                      onChange={(e) => 
                                        handleQuantityChange(product.id, basePrice, Number(e.target.value) || 1)
                                      }
                                      className="w-20 h-8"
                                      disabled={!isSelected}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    ${isSelected ? currentTotal.toFixed(2) : basePrice.toFixed(2)}
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
                    <Button size="sm">
                      <PackagePlus className="w-4 h-4 mr-2" />
                      Vincular Productos
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
              </div>
            </div>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeProduct(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <CardTitle>Transacciones Pendientes</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex gap-2 items-center">
                      <Calendar className="w-4 h-4" />
                      <Input
                        type="date"
                        placeholder="Desde"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-36"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="date"
                        placeholder="Hasta"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-36"
                      />
                      {(startDate || endDate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStartDate("");
                            setEndDate("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTransactions.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div>
                      <p className="font-semibold">
                        {selectedTransactions.length} transacciones seleccionadas
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total: ${selectedTotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTransactions([])}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteSelected}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handlePaySelected}
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Marcar como Pagado
                      </Button>
                    </div>
                  </div>
                )}
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historial de Pagos</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DebtsSummary({ customers }: { customers: Customer[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Deudas</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
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
