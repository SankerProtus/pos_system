import { isValidElement } from "react";
import { Loader2 } from "lucide-react";

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  leftIcon,
  rightIcon,
  iconPosition = "left",
  className = "",
  type = "button",
  ...props
}) => {
  const renderIcon = (iconValue) => {
    if (!iconValue) return null;

    if (isValidElement(iconValue)) {
      return iconValue;
    }

    const IconComponent = iconValue;
    return <IconComponent size={18} />;
  };

  const leadingIcon = leftIcon ?? (iconPosition === "left" ? Icon : null);
  const trailingIcon = rightIcon ?? (iconPosition === "right" ? Icon : null);

  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? "w-full" : ""}
  `;

  const variants = {
    primary: `
      bg-blue-600 text-white
      hover:bg-blue-700 active:bg-blue-800
      focus:ring-blue-500
      disabled:hover:bg-blue-600
    `,
    secondary: `
      bg-slate-600 text-white
      hover:bg-slate-700 active:bg-slate-800
      focus:ring-slate-500
      disabled:hover:bg-slate-600
    `,
    outline: `
      bg-white text-slate-700 border-2 border-slate-300
      hover:bg-slate-50 active:bg-slate-100
      focus:ring-slate-500
      disabled:hover:bg-white
    `,
    ghost: `
      bg-transparent text-slate-700
      hover:bg-slate-100 active:bg-slate-200
      focus:ring-slate-500
      disabled:hover:bg-transparent
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700 active:bg-red-800
      focus:ring-red-500
      disabled:hover:bg-red-600
    `,
    google: `
      bg-white text-slate-700 border-2 border-slate-300
      hover:bg-slate-50 active:bg-slate-100
      focus:ring-slate-500
      disabled:hover:bg-white
    `,
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
        hover:cursor-pointer
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        <>
          {renderIcon(leadingIcon)}
          {children}
          {renderIcon(trailingIcon)}
        </>
      )}
    </button>
  );
};
