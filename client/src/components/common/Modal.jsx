import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export const Modal = ({
  isOpen,
  onClose,
  title,
  width = 480,
  children,
  className,
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-[#141d2e] border border-[#263548] rounded-2xl shadow-2xl",
          className,
        )}
        style={{ width: `${width}px`, maxWidth: "90vw", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#263548]">
          <h2 className="text-xl font-bold text-amber-200 drop-shadow-sm">{title}</h2>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-200 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto text-slate-100 text-base"
          style={{ maxHeight: "calc(90vh - 80px)", color: '#f8fafc' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};
