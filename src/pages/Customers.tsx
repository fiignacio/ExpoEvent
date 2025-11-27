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
    type: "customer" as "customer" | "supplier",
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
      type: "customer",
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clientes y Proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona clientes, proveedores y sus transacciones
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cliente/Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Editar" : "Nuevo"} Cliente/Proveedor
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    onValueChange={(value: "customer" | "supplier") =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Cliente</SelectItem>
                      <SelectItem value="supplier">Proveedor</SelectItem>
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
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="debts">Deudas Pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Clientes y Proveedores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            customer.type === "customer" ? "default" : "secondary"
                          }
                        >
                          {customer.type === "customer" ? "Cliente" : "Proveedor"}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCustomer(customer.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
  const { products, addProduct, addMultipleProducts, removeProduct } = useCustomerProducts(customer.id);
  const { transactions, addTransaction, markAsPaid, markMultipleAsPaid, getBalance } =
    useCustomerTransactions(customer.id);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"debt" | "payment">("debt");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
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

  const selectedTotal = filteredPendingTransactions
    .filter((t) => selectedTransactions.includes(t.id))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{customer.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {customer.type === "customer" ? "Cliente" : "Proveedor"}
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-2" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Receipt className="w-4 h-4 mr-2" />
              Transacciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Productos vinculados</h3>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PackagePlus className="w-4 h-4 mr-2" />
                    Vincular Productos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Vincular Productos</DialogTitle>
                  </DialogHeader>
                  <BulkProductSelector
                    products={allProducts}
                    existingProductIds={existingProductIds}
                    onAddProducts={handleAddMultipleProducts}
                    onClose={() => setProductDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.product?.name}</TableCell>
                    <TableCell>{product.product?.sku}</TableCell>
                    <TableCell>${Number(product.price).toFixed(2)}</TableCell>
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
                ))}
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
                      <DialogContent>
                        <DialogHeader>
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsPaid(transaction.id)}
                                className="whitespace-nowrap"
                              >
                                <CheckSquare className="w-4 h-4 mr-1" />
                                Marcar Pagado
                              </Button>
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
          variant={customer.type === "customer" ? "default" : "secondary"}
        >
          {customer.type === "customer" ? "Cliente" : "Proveedor"}
        </Badge>
      </TableCell>
      <TableCell className={`font-semibold ${balance > 0 ? "text-destructive" : "text-green-500"}`}>
        ${balance.toFixed(2)}
      </TableCell>
      <TableCell>{pendingCount}</TableCell>
    </TableRow>
  );
}
