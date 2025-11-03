import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Package, Users } from "lucide-react";

const salesData = [
  { name: "Lun", ventas: 4500, transacciones: 45 },
  { name: "Mar", ventas: 5200, transacciones: 52 },
  { name: "Mié", ventas: 4800, transacciones: 48 },
  { name: "Jue", ventas: 6100, transacciones: 61 },
  { name: "Vie", ventas: 7500, transacciones: 75 },
  { name: "Sáb", ventas: 8200, transacciones: 82 },
  { name: "Dom", ventas: 6800, transacciones: 68 },
];

const categoryData = [
  { name: "Bebidas", value: 45, color: "#2563eb" },
  { name: "Comida", value: 30, color: "#10b981" },
  { name: "Panadería", value: 25, color: "#f59e0b" },
];

const topProducts = [
  { name: "Café Americano", ventas: 250, ingresos: 1250 },
  { name: "Capuccino", ventas: 180, ingresos: 1080 },
  { name: "Sándwich", ventas: 120, ingresos: 1020 },
  { name: "Croissant", ventas: 150, ingresos: 675 },
  { name: "Ensalada", ventas: 90, ingresos: 630 },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes y Analytics</h1>
        <p className="text-muted-foreground mt-1">Análisis detallado de tu negocio</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Totales</p>
                <p className="text-2xl font-bold text-success mt-1">$43,100</p>
                <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-success flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-2xl font-bold mt-1">431</p>
                <p className="text-xs text-success mt-1">+12% vs semana anterior</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                <p className="text-2xl font-bold mt-1">$100.00</p>
                <p className="text-xs text-muted-foreground mt-1">Por transacción</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-warning flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Productos Vendidos</p>
                <p className="text-2xl font-bold mt-1">790</p>
                <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-subtle flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Día</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ventas" fill="#10b981" name="Ventas ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transacciones por Día</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="transacciones" stroke="#2563eb" strokeWidth={2} name="Transacciones" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ventas" fill="#2563eb" name="Unidades Vendidas" />
                  <Bar dataKey="ingresos" fill="#10b981" name="Ingresos ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
