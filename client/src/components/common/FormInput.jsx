import { forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

export const FormInput = forwardRef(
  (
    {
      label,
      id,
      type = "text",
      error,
      placeholder,
      className = "",
      showPasswordToggle = false,
      showPassword,
      onTogglePassword,
      icon: Icon,
      disabled = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon size={20} />
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={showPasswordToggle ? (showPassword ? "text" : "password") : type}
            disabled={disabled}
            className={`
              w-full px-4 py-3 
              ${Icon ? "pl-11" : ""}
              bg-white border border-slate-300 
              rounded-lg text-slate-900 
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
              transition duration-200
              ${error ? "border-red-500 focus:ring-red-500" : ""}
              ${className}
            `}
            placeholder={placeholder}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
