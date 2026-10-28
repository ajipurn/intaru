import { LoaderCircle } from "lucide-react";
import type { LucideProps } from "lucide-react";

export function Spinner({ size = 16, ...props }: LucideProps) {
  return <LoaderCircle size={size} {...props} className="spin" />;
}
