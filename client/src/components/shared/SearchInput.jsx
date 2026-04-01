import { Search, X } from "lucide-react";

export const SearchInput = ({
  value = "",
  onChange,
  onClear,
  placeholder = "Search...",
}) => {
  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) onChange("");
  };

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        size={18}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};
