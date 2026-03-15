import { cn } from "../../utils/cn";

export const EmptyState = ({ icon: Icon, title, description, className }) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="rounded-full bg-slate-800/50 p-4 mb-4">
          <Icon size={32} className="text-slate-500" />
        </div>
      )}
      <h3 className="text-lg font-medium text-slate-300 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm">{description}</p>
      )}
    </div>
  );
};
