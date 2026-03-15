import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  title = "Confirm Action",
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={420}>
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="rounded-full bg-amber-500/10 p-2">
            <AlertTriangle className="text-amber-400" size={24} />
          </div>
          <p className="text-slate-300 flex-1 pt-1">{message}</p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
