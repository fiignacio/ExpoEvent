import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, DollarSign, Package, Receipt } from "lucide-react";
import {
  useCustomers,
  useCustomerProducts,
  useCustomerTransactions,
  Customer,
} from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";

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
  const { products, addProduct, removeProduct } = useCustomerProducts(customer.id);
  const { transactions, addTransaction, markAsPaid, getBalance } =
    useCustomerTransactions(customer.id);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"debt" | "payment">("debt");

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProduct(selectedProductId, Number(productPrice));
    setProductDialogOpen(false);
    setSelectedProductId("");
    setProductPrice("");
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTransaction(transactionType, Number(transactionAmount), transactionDescription);
    setTransactionDialogOpen(false);
    setTransactionAmount("");
    setTransactionDescription("");
  };

  const balance = getBalance();
  const pendingTransactions = transactions.filter((t) => t.status === "pending");
  const paidTransactions = transactions.filter((t) => t.status === "paid");

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
                    <Plus className="w-4 h-4 mr-2" />
                    Vincular Producto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vincular Producto</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Producto</Label>
                      <Select
                        value={selectedProductId}
                        onValueChange={setSelectedProductId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {allProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.sku}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Precio</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setProductDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit">Vincular</Button>
                    </div>
                  </form>
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
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Balance actual</h3>
                <p className={`text-2xl font-bold ${balance > 0 ? "text-red-500" : "text-green-500"}`}>
                  ${balance.toFixed(2)}
                </p>
              </div>
              <Dialog
                open={transactionDialogOpen}
                onOpenChange={setTransactionDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <DollarSign className="w-4 h-4 mr-2" />
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

            <div>
              <h4 className="font-semibold mb-2">Pendientes</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={transaction.type === "debt" ? "destructive" : "default"}
                        >
                          {transaction.type === "debt" ? "Deuda" : "Pago"}
                        </Badge>
                      </TableCell>
                      <TableCell>${Number(transaction.amount).toFixed(2)}</TableCell>
                      <TableCell>{transaction.description || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => markAsPaid(transaction.id)}
                        >
                          Marcar como Pagado
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Historial</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Pagado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={transaction.type === "debt" ? "destructive" : "default"}
                        >
                          {transaction.type === "debt" ? "Deuda" : "Pago"}
                        </Badge>
                      </TableCell>
                      <TableCell>${Number(transaction.amount).toFixed(2)}</TableCell>
                      <TableCell>{transaction.description || "-"}</TableCell>
                      <TableCell>
                        {transaction.paid_at
                          ? new Date(transaction.paid_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DebtsSummary({ customers }: { customers: Customer[] }) {
  const [debts, setDebts] = useState<
    Array<{ customer: Customer; balance: number; pending: number }>
  >([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Deudas Pendientes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente/Proveedor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Transacciones Pendientes</TableHead>
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
  const pending = transactions.filter((t) => t.status === "pending").length;

  if (balance === 0) return null;

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell>
        <Badge variant={customer.type === "customer" ? "default" : "secondary"}>
          {customer.type === "customer" ? "Cliente" : "Proveedor"}
        </Badge>
      </TableCell>
      <TableCell>
        <span className={balance > 0 ? "text-red-500 font-bold" : "text-green-500 font-bold"}>
          ${balance.toFixed(2)}
        </span>
      </TableCell>
      <TableCell>{pending}</TableCell>
    </TableRow>
  );
}
