import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, Coins } from "lucide-react";

interface Denomination {
  value: number;
  type: "billete" | "moneda";
  label: string;
}

const DENOMINATIONS: Denomination[] = [
  { value: 20000, type: "billete", label: "$20.000" },
  { value: 10000, type: "billete", label: "$10.000" },
  { value: 5000, type: "billete", label: "$5.000" },
  { value: 2000, type: "billete", label: "$2.000" },
  { value: 1000, type: "billete", label: "$1.000" },
  { value: 500, type: "moneda", label: "$500" },
  { value: 100, type: "moneda", label: "$100" },
  { value: 50, type: "moneda", label: "$50" },
  { value: 10, type: "moneda", label: "$10" },
];

export interface DenominationBreakdownData {
  [key: number]: number;
}

interface DenominationBreakdownProps {
  onChange: (breakdown: DenominationBreakdownData, total: number) => void;
  initialBreakdown?: DenominationBreakdownData;
}

export function DenominationBreakdown({ onChange, initialBreakdown }: DenominationBreakdownProps) {
  const [counts, setCounts] = useState<DenominationBreakdownData>(() => {
    if (initialBreakdown) return initialBreakdown;
    return DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {});
  });

  const total = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.value] || 0) * d.value, 0);

  useEffect(() => {
    onChange(counts, total);
  }, [counts, total, onChange]);

  const updateCount = (value: number, count: string) => {
    const numCount = parseInt(count) || 0;
    setCounts(prev => ({ ...prev, [value]: Math.max(0, numCount) }));
  };

  const billetes = DENOMINATIONS.filter(d => d.type === "billete");
  const monedas = DENOMINATIONS.filter(d => d.type === "moneda");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Billetes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            <Label className="font-semibold">Billetes</Label>
          </div>
          <div className="space-y-2">
            {billetes.map(d => (
              <div key={d.value} className="flex items-center gap-2">
                <span className="text-sm w-16">{d.label}</span>
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  min="0"
                  value={counts[d.value] || ""}
                  onChange={(e) => updateCount(d.value, e.target.value)}
                  className="w-16 h-8 text-center"
                  placeholder="0"
                />
                <span className="text-xs text-muted-foreground w-20 text-right">
                  ${((counts[d.value] || 0) * d.value).toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monedas */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            <Label className="font-semibold">Monedas</Label>
          </div>
          <div className="space-y-2">
            {monedas.map(d => (
              <div key={d.value} className="flex items-center gap-2">
                <span className="text-sm w-12">{d.label}</span>
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  min="0"
                  value={counts[d.value] || ""}
                  onChange={(e) => updateCount(d.value, e.target.value)}
                  className="w-16 h-8 text-center"
                  placeholder="0"
                />
                <span className="text-xs text-muted-foreground w-16 text-right">
                  ${((counts[d.value] || 0) * d.value).toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Contado:</span>
            <Badge variant="default" className="text-lg px-3 py-1">
              ${total.toLocaleString('es-CL')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
