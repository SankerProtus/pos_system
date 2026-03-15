import { cn } from "../../utils/cn";

const colorVariants = {
  amber: "text-amber-400",
  green: "text-emerald-400",
  indigo: "text-indigo-400",
  red: "text-red-400",
  default: "text-slate-100",
};

// The KPI Card is a dashboard component that displays a key performance indicator (KPI) with a label, value, and optional subtitle. It supports color variants for the value text to indicate different types of KPIs (e.g., revenue, growth, etc.).
export const KpiCard = ({
  label,
  value,
  subtitle,
  colorVariant = "default",
}) => {
  return (
    <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl p-5 min-h-22.5">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-bold font-mono",
          colorVariants[colorVariant],
        )}
      >
        {value}
      </p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
};
