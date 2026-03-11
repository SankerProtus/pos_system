import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";

export const Alert = ({ type = "info", message, onClose }) => {
  const config = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: CheckCircle,
      iconColor: "text-green-500",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: XCircle,
      iconColor: "text-red-500",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: AlertCircle,
      iconColor: "text-yellow-500",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: Info,
      iconColor: "text-blue-500",
    },
  };

  const { bg, border, text, icon: Icon, iconColor } = config[type];

  return (
    <div
      className={`${bg} ${border} ${text} border rounded-lg p-4 flex items-start gap-3`}
      role="alert"
    >
      <Icon className={`${iconColor} shrink-0 mt-0.5`} size={20} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className={`${text} hover:opacity-70 transition`}
          aria-label="Close alert"
        >
          <XCircle size={18} />
        </button>
      )}
    </div>
  );
};
