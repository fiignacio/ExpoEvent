import { Product } from "@/types/product";

export const DEFAULT_EVENT_PRODUCTS: Product[] = [
  {
    id: "evt-001",
    sku: "TSH-001",
    name: "Polera Oficial Evento 2026",
    category: "Merchandising",
    stock: 150,
    price: 15000,
    cost: 7000,
    promotion: {
      type: "bulk",
      quantity: 2,
      discountedPrice: 25000
    }
  },
  {
    id: "evt-002",
    sku: "CAP-001",
    name: "Jockey / Gorro Bordado",
    category: "Merchandising",
    stock: 80,
    price: 10000,
    cost: 4000,
    promotion: {
      type: "bulk",
      quantity: 3,
      discountedPrice: 25000
    }
  },
  {
    id: "evt-003",
    sku: "MUG-001",
    name: "Taza Conmemorativa",
    category: "Accesorios",
    stock: 120,
    price: 7000,
    cost: 2500,
    promotion: {
      type: "percentage",
      discountPercentage: 15
    }
  },
  {
    id: "evt-004",
    sku: "BEB-001",
    name: "Bebida / Agua Mineral 500ml",
    category: "Bebidas y Snacks",
    stock: 300,
    price: 2000,
    cost: 800,
    promotion: {
      type: "bulk",
      quantity: 3,
      discountedPrice: 5000
    }
  },
  {
    id: "evt-005",
    sku: "SNK-001",
    name: "Combo Snack & Ensalada",
    category: "Bebidas y Snacks",
    stock: 90,
    price: 4500,
    cost: 2000,
    promotion: {
      type: "fixed",
      discountAmount: 1000
    }
  },
  {
    id: "evt-006",
    sku: "VIP-001",
    name: "Pase VIP Acceso Exclusivo",
    category: "Entradas",
    stock: 50,
    price: 35000,
    cost: 5000
  }
];
