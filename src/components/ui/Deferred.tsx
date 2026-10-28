import { Suspense } from "react";
import type { ReactNode } from "react";
import { Spinner } from "./Spinner";

/** Lazy content with a full-size loading placeholder. */
export function Deferred({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="map-placeholder" role="status">
          <Spinner size={24} />
          <p>{label}</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
