import type { ReactNode } from "react";
import { Button } from "react-aria-components";
import { RotateCcw } from "lucide-react";
import { Spinner } from "./Spinner";

export function StatusNotice({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={className} role="status">
      <Spinner />
      {children}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="map-error" role="alert">
      <span>{message}</span>
      <Button onPress={onRetry}>
        <RotateCcw size={15} />
        Coba lagi
      </Button>
    </div>
  );
}
