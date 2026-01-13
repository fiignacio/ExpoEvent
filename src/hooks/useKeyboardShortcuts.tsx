import { useEffect, useCallback } from "react";
import { toast } from "sonner";

interface KeyboardShortcutsConfig {
  onSearch?: () => void;
  onClearCart?: () => void;
  onPendingSale?: () => void;
  onProcessPayment?: () => void;
  onIncrementLast?: () => void;
  onDecrementLast?: () => void;
  onPaymentMethod?: (method: "efectivo" | "debito" | "credito" | "transferencia") => void;
  onEscape?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSearch,
  onClearCart,
  onPendingSale,
  onProcessPayment,
  onIncrementLast,
  onDecrementLast,
  onPaymentMethod,
  onEscape,
  onEnter,
  enabled = true
}: KeyboardShortcutsConfig) {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignorar si está escribiendo en un input
    const target = event.target as HTMLElement;
    const isInputFocused = target.tagName === "INPUT" || 
                           target.tagName === "TEXTAREA" || 
                           target.isContentEditable;
    
    // Solo permitir ESC y Enter en inputs
    if (isInputFocused && !["Escape", "Enter"].includes(event.key)) {
      return;
    }

    switch (event.key) {
      case "F1":
        event.preventDefault();
        onPaymentMethod?.("efectivo");
        toast.info("💵 Método: Efectivo", { duration: 1500 });
        break;
      case "F2":
        event.preventDefault();
        onPaymentMethod?.("debito");
        toast.info("💳 Método: Débito", { duration: 1500 });
        break;
      case "F3":
        event.preventDefault();
        onPaymentMethod?.("credito");
        toast.info("💳 Método: Crédito", { duration: 1500 });
        break;
      case "F4":
        event.preventDefault();
        onPaymentMethod?.("transferencia");
        toast.info("📱 Método: Transferencia", { duration: 1500 });
        break;
      case "F5":
        event.preventDefault();
        onSearch?.();
        break;
      case "F6":
        event.preventDefault();
        onClearCart?.();
        break;
      case "F7":
        event.preventDefault();
        onPendingSale?.();
        break;
      case "F8":
        event.preventDefault();
        onProcessPayment?.();
        break;
      case "+":
      case "=":
        if (!isInputFocused) {
          event.preventDefault();
          onIncrementLast?.();
        }
        break;
      case "-":
        if (!isInputFocused) {
          event.preventDefault();
          onDecrementLast?.();
        }
        break;
      case "Escape":
        event.preventDefault();
        onEscape?.();
        break;
      case "Enter":
        if (!isInputFocused) {
          event.preventDefault();
          onEnter?.();
        }
        break;
    }
  }, [enabled, onSearch, onClearCart, onPendingSale, onProcessPayment, 
      onIncrementLast, onDecrementLast, onPaymentMethod, onEscape, onEnter]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Component that shows available shortcuts
export function ShortcutsHelp() {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F1</kbd>
        <span>Efectivo</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F2</kbd>
        <span>Débito</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F3</kbd>
        <span>Crédito</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F4</kbd>
        <span>Transferencia</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F5</kbd>
        <span>Buscar</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F6</kbd>
        <span>Limpiar carrito</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F7</kbd>
        <span>Venta pendiente</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F8</kbd>
        <span>Cobrar</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">+/-</kbd>
        <span>Cantidad último</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd>
        <span>Cancelar</span>
      </div>
    </div>
  );
}
