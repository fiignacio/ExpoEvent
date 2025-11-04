import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: "text" | "number";
}

export function EditableCell({ value, onSave, type = "text" }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (type === "number") {
      onSave(Number(editValue));
    } else {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="cursor-pointer hover:bg-accent px-2 py-1 rounded min-h-[2rem] flex items-center"
      >
        {type === "number" && typeof value === "number" ? value.toLocaleString('es-CL') : value}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(type === "number" ? e.target.value : e.target.value)}
        className="h-8"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
      />
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
        <Check className="w-4 h-4 text-success" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
        <X className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}
