import { cn } from "../../utils/cn";

const variantStyles = {
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  muted: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export const Badge = ({ children, variant = "muted", className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};
