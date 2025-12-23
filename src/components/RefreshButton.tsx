import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  showText?: boolean;
}

export function RefreshButton({
  onRefresh,
  className,
  variant = "outline",
  size = "sm",
  showText = false,
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn("gap-2", className)}
    >
      <RefreshCw
        className={cn(
          "h-4 w-4",
          isRefreshing && "animate-spin"
        )}
      />
      {showText && (
        <span className="hidden sm:inline">
          {isRefreshing ? "Actualizando..." : "Actualizar"}
        </span>
      )}
    </Button>
  );
}
