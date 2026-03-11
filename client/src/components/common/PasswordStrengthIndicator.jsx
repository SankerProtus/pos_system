import { useMemo } from "react";
import { Check, X } from "lucide-react";

export const PasswordStrengthIndicator = ({ password }) => {
  const { strength, checks } = useMemo(() => {
    if (!password) {
      return {
        strength: 0,
        checks: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        },
      };
    }

    const newChecks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    // Calculate strength (0-4)
    let score = 0;
    if (newChecks.length) score++;
    if (newChecks.uppercase && newChecks.lowercase) score++;
    if (newChecks.number) score++;
    if (newChecks.special) score++;

    return { strength: score, checks: newChecks };
  }, [password]);

  if (!password) return null;

  const strengthConfig = {
    0: { label: "Very Weak", color: "bg-red-500", width: "w-1/4" },
    1: { label: "Weak", color: "bg-orange-500", width: "w-2/4" },
    2: { label: "Fair", color: "bg-yellow-500", width: "w-3/4" },
    3: { label: "Good", color: "bg-green-500", width: "w-full" },
    4: { label: "Strong", color: "bg-green-600", width: "w-full" },
  };

  const current = strengthConfig[strength];

  return (
    <div className="mt-3 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${current.color} transition-all duration-300 ${current.width}`}
          />
        </div>
        <span className="text-xs font-medium text-slate-600 min-w-17.5">
          {current.label}
        </span>
      </div>

      {/* Password Requirements */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <RequirementItem
          checked={checks.length}
          label="At least 8 characters"
        />
        <RequirementItem checked={checks.uppercase} label="Uppercase letter" />
        <RequirementItem checked={checks.lowercase} label="Lowercase letter" />
        <RequirementItem checked={checks.number} label="Number" />
      </div>
    </div>
  );
};

const RequirementItem = ({ checked, label }) => (
  <div className="flex items-center gap-1.5">
    <div
      className={`shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
        checked ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"
      }`}
    >
      {checked ? <Check size={10} /> : <X size={10} />}
    </div>
    <span className={checked ? "text-slate-700" : "text-slate-500"}>
      {label}
    </span>
  </div>
);
