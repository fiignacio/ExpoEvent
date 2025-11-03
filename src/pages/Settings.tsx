import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/hooks/useSettings";
import { Store, DollarSign, Receipt, Package } from "lucide-react";
import { useState, useEffect } from "react";

export default function Settings() {
  const { settings, isLoading, updateSettings } = useSettings();
  const [formData, setFormData] = useState({
    business_name: "",
    business_address: "",
    business_phone: "",
    business_email: "",
    tax_rate: 0,
    currency: "MXN",
    currency_symbol: "$",
    receipt_footer: "",
    low_stock_threshold: 10,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        business_name: settings.business_name,
        business_address: settings.business_address || "",
        business_phone: settings.business_phone || "",
        business_email: settings.business_email || "",
        tax_rate: Number(settings.tax_rate),
        currency: settings.currency,
        currency_symbol: settings.currency_symbol,
        receipt_footer: settings.receipt_footer || "",
        low_stock_threshold: settings.low_stock_threshold,
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground mt-1">Configura tu sistema de punto de venta</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Cargando configuración...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">Configura tu sistema de punto de venta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del Negocio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Información del Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Nombre del Negocio *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => handleChange("business_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_address">Dirección</Label>
              <Input
                id="business_address"
                value={formData.business_address}
                onChange={(e) => handleChange("business_address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_phone">Teléfono</Label>
                <Input
                  id="business_phone"
                  value={formData.business_phone}
                  onChange={(e) => handleChange("business_phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_email">Correo Electrónico</Label>
                <Input
                  id="business_email"
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => handleChange("business_email", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración Fiscal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Configuración Fiscal y Moneda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tasa de Impuesto (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => handleChange("tax_rate", parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency_symbol">Símbolo</Label>
                <Input
                  id="currency_symbol"
                  value={formData.currency_symbol}
                  onChange={(e) => handleChange("currency_symbol", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Inventario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Configuración de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">
                Umbral de Stock Bajo (unidades)
              </Label>
              <Input
                id="low_stock_threshold"
                type="number"
                min="0"
                value={formData.low_stock_threshold}
                onChange={(e) => handleChange("low_stock_threshold", parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Se mostrará una alerta cuando el stock esté por debajo de este número
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Recibos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Configuración de Recibos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt_footer">Pie de Página del Recibo</Label>
              <Textarea
                id="receipt_footer"
                value={formData.receipt_footer}
                onChange={(e) => handleChange("receipt_footer", e.target.value)}
                placeholder="Gracias por su compra..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg">
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  );
}
