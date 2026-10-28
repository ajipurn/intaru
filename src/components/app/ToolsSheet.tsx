import type { ReactNode } from "react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Layers2, X } from "lucide-react";

/** Bottom sheet that holds the sidebar on narrow screens. */
export function ToolsSheet({ isOpen, onOpenChange, children }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <ModalOverlay className="modal-overlay tools-overlay" isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
      <Modal className="tools-modal">
        <Dialog aria-label="Cari lokasi dan atur layer">
          <div className="modal-top">
            <Heading slot="title">
              <Layers2 size={19} />
              Layer & pengaturan
            </Heading>
            <Button className="icon-button" onPress={() => onOpenChange(false)} aria-label="Tutup pengaturan peta">
              <X size={20} />
            </Button>
          </div>
          {isOpen && children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
