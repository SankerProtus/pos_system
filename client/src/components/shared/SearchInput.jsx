import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

export const SearchInput = ({
  onSearch,
  placeholder = "Search...",
  debounceMs = 300,
}) => {   
  const [value, setValue] = useState("");

  const debouncedSearch = useCallback(
    (searchValue) => {
      const handler = setTimeout(() => {
        onSearch(searchValue);
      }, debounceMs);

      return () => clearTimeout(handler);
    },
    [onSearch, debounceMs],
  );

  useEffect(() => {
    const cleanup = debouncedSearch(value);
    return cleanup;
  }, [value, debouncedSearch]);

  const handleClear = () => {
    setValue("");
    onSearch("");
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
        onChange={(e) => setValue(e.target.value)}
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
