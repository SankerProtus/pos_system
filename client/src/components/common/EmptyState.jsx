import { cn } from "../../utils/cn";

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  className,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
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
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="rounded-lg border border-[#263548] bg-[#0f172a] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-[#141d2e]"
            >
              {secondaryActionLabel}
            </button>
          )}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
