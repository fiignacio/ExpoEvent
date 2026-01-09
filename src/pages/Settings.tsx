import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { Store, DollarSign, Receipt, Package, Settings as SettingsIcon, Banknote, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function Settings() {
  const { settings, isLoading, updateSettings } = useSettings();
  const { currentRate, isFetching, fetchLiveRate, getLastUpdateText } = useExchangeRate();
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
    allow_negative_stock: false,
    auto_print_receipt: false,
    require_customer_info: false,
    enable_promotions: true,
    quick_cash_amounts: "[3000, 5000, 10000, 20000]",
    usd_exchange_rate: 950,
    auto_fetch_exchange_rate: false,
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
        allow_negative_stock: settings.allow_negative_stock ?? false,
        auto_print_receipt: settings.auto_print_receipt ?? false,
        require_customer_info: settings.require_customer_info ?? false,
        enable_promotions: settings.enable_promotions ?? true,
        quick_cash_amounts: settings.quick_cash_amounts || "[3000, 5000, 10000, 20000]",
        usd_exchange_rate: Number(settings.usd_exchange_rate) || 950,
        auto_fetch_exchange_rate: settings.auto_fetch_exchange_rate ?? false,
      });
    }
  }, [settings]);

  const parseQuickAmounts = (): number[] => {
    try {
      return JSON.parse(formData.quick_cash_amounts);
    } catch {
      return [3000, 5000, 10000, 20000];
    }
  };

  const updateQuickAmount = (index: number, value: number) => {
    const amounts = parseQuickAmounts();
    amounts[index] = value;
    handleChange("quick_cash_amounts", JSON.stringify(amounts));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  const handleChange = (field: string, value: string | number | boolean) => {
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

        {/* Configuración de Pagos en Efectivo */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Banknote className="h-4 w-4 sm:h-5 sm:w-5" />
              Configuración de Pagos en Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Montos de Denominación Rápida */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-sm sm:text-base">Montos de Denominación Rápida (CLP)</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Botones de acceso rápido para pagos en efectivo
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {parseQuickAmounts().map((amount, index) => (
                  <div key={index} className="space-y-1">
                    <Label htmlFor={`quick_amount_${index}`} className="text-[10px] sm:text-xs text-muted-foreground">
                      Botón {index + 1}
                    </Label>
                    <Input
                      id={`quick_amount_${index}`}
                      type="number"
                      min="100"
                      step="100"
                      value={amount}
                      onChange={(e) => updateQuickAmount(index, parseInt(e.target.value) || 0)}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tipo de Cambio USD/CLP */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-sm sm:text-base">Tipo de Cambio USD/CLP</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tasa de conversión para pagos en dólares
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="usd_exchange_rate" className="text-[10px] sm:text-xs text-muted-foreground">
                    1 USD =
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="usd_exchange_rate"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.usd_exchange_rate}
                      onChange={(e) => handleChange("usd_exchange_rate", parseFloat(e.target.value) || 950)}
                      className="h-9 sm:h-10 text-sm"
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground">CLP</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchLiveRate(true)}
                  disabled={isFetching}
                  className="gap-1.5 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
                >
                  {isFetching ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  <span className="truncate">Actualizar desde API</span>
                </Button>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Última actualización: {getLastUpdateText()}
              </p>
            </div>

            {/* Auto-fetch toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label htmlFor="auto_fetch_exchange_rate" className="text-sm sm:text-base">
                  Actualización Automática
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Obtener tipo de cambio automáticamente al abrir POS
                </p>
              </div>
              <Switch
                id="auto_fetch_exchange_rate"
                checked={formData.auto_fetch_exchange_rate}
                onCheckedChange={(checked) => handleChange("auto_fetch_exchange_rate", checked)}
              />
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

        {/* Opciones Avanzadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Opciones Avanzadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow_negative_stock" className="text-base">
                  Permitir Ventas sin Stock
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permite realizar ventas aunque el producto tenga stock 0 o negativo
                </p>
              </div>
              <Switch
                id="allow_negative_stock"
                checked={formData.allow_negative_stock}
                onCheckedChange={(checked) => handleChange("allow_negative_stock", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto_print_receipt" className="text-base">
                  Imprimir Recibo Automáticamente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Imprime el recibo automáticamente después de completar una venta
                </p>
              </div>
              <Switch
                id="auto_print_receipt"
                checked={formData.auto_print_receipt}
                onCheckedChange={(checked) => handleChange("auto_print_receipt", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require_customer_info" className="text-base">
                  Requerir Información del Cliente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Solicita información del cliente antes de completar una venta
                </p>
              </div>
              <Switch
                id="require_customer_info"
                checked={formData.require_customer_info}
                onCheckedChange={(checked) => handleChange("require_customer_info", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable_promotions" className="text-base">
                  Habilitar Sistema de Promociones
                </Label>
                <p className="text-sm text-muted-foreground">
                  Activa el sistema de descuentos y promociones en el punto de venta
                </p>
              </div>
              <Switch
                id="enable_promotions"
                checked={formData.enable_promotions}
                onCheckedChange={(checked) => handleChange("enable_promotions", checked)}
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
