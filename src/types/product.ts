export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  cost: number;
  promotion?: Promotion;
}

export interface Promotion {
  type: "bulk" | "percentage" | "fixed";
  quantity?: number; // Para promociones tipo "3 x 10000"
  discountedPrice?: number; // Precio total para la cantidad
  discountPercentage?: number; // Para descuentos porcentuales
  discountAmount?: number; // Para descuentos fijos
}

export interface CartItem extends Product {
  quantity: number;
  appliedDiscount?: number;
  originalPrice: number;
  isCustomerPrice?: boolean;
}
