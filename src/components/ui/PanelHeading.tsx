import { Button } from "react-aria-components";
import { X } from "lucide-react";

export function PanelHeading({ title, closeLabel, onClose }: { title: string; closeLabel: string; onClose: () => void }) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      <Button className="icon-button" onPress={onClose} aria-label={closeLabel}>
        <X size={18} />
      </Button>
    </div>
  );
}
