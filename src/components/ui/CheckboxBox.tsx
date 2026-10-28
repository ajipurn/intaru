import { Check, Minus } from "lucide-react";

export function CheckboxBox({ indeterminate = false }: { indeterminate?: boolean }) {
  const Icon = indeterminate ? Minus : Check;
  return (
    <span className="checkbox-box">
      <Icon size={12} strokeWidth={3} />
    </span>
  );
}
