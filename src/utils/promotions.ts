import { CartItem, Product } from "@/types/product";

export function calculatePromotionDiscount(item: CartItem): number {
  if (!item.promotion) return 0;

  const promotion = item.promotion;

  switch (promotion.type) {
    case "bulk":
      if (promotion.quantity && promotion.discountedPrice) {
        const promoSets = Math.floor(item.quantity / promotion.quantity);
        const remainingItems = item.quantity % promotion.quantity;
        
        const promoTotal = promoSets * promotion.discountedPrice;
        const regularTotal = remainingItems * item.price;
        const actualTotal = promoTotal + regularTotal;
        const originalTotal = item.quantity * item.price;
        
        return originalTotal - actualTotal;
      }
      break;

    case "percentage":
      if (promotion.discountPercentage) {
        return (item.price * item.quantity * promotion.discountPercentage) / 100;
      }
      break;

    case "fixed":
      if (promotion.discountAmount) {
        return promotion.discountAmount * item.quantity;
      }
      break;
  }

  return 0;
}

export function getPromotionLabel(item: Product): string {
  if (!item.promotion) return "";

  const promo = item.promotion;

  switch (promo.type) {
    case "bulk":
      if (promo.quantity && promo.discountedPrice) {
        return `${promo.quantity} x $${promo.discountedPrice.toFixed(2)}`;
      }
      break;
    case "percentage":
      return `${promo.discountPercentage}% OFF`;
    case "fixed":
      return `$${promo.discountAmount} OFF`;
  }

  return "";
}
