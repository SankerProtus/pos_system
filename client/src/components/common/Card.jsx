import { cn } from "../../utils/cn";

export const Card = ({ children, className }) => {
  return (
    <div
      className={cn(
        "bg-[#141d2e] border border-[#1e2d45] rounded-xl p-5",
        className,
      )}
    >
      {children}
    </div>
  );
};
