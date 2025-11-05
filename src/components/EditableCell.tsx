import { Input } from "@/components/ui/input";

interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: "text" | "number";
}

export function EditableCell({ value, onSave, type = "text" }: EditableCellProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === "number" ? Number(e.target.value) : e.target.value;
    onSave(newValue);
  };

  return (
    <Input
      type={type}
      value={value}
      onChange={handleChange}
      onBlur={handleChange}
      className="h-8 bg-accent/50"
    />
  );
}
