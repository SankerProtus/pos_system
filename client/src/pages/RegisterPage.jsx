import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "../schemas/authSchema.js";
import { Link } from "react-router-dom";
import { User, Mail, Lock, UserPlus, Shield } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { AuthLayout } from "../components/auth/AuthLayout";
import {
  FormInput,
  Button,
  GoogleOAuthButton,
  Alert,
  PasswordStrengthIndicator,
} from "../components/common";

const ROLES = [
  {
    value: "cashier",
    label: "Cashier",
    description: "Handle sales and transactions",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Manage inventory and staff",
  },
  { value: "admin", label: "Admin", description: "Full system access" },
];

export const RegisterPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "",
    },
  });

  const { signup, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const password = watch("password");

  const handleFormSubmit = async (data) => {
    await signup(data);
  };

  const handleGoogleSignup = () => {
    // Redirect to backend Passport OAuth endpoint
    const apiUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register to access your POS system"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Error Alert */}
        {error && <Alert type="error" message={error} />}

        {/* Full Name Field */}
        <FormInput
          {...register("fullName")}
          id="fullName"
          label="Full Name"
          type="text"
          placeholder="John Doe"
          icon={User}
          error={errors.fullName?.message}
          disabled={loading}
        />

        {/* Email Field */}
        <FormInput
          {...register("email")}
          id="email"
          label="Email Address"
          type="email"
          placeholder="your.email@example.com"
          icon={Mail}
          error={errors.email?.message}
          disabled={loading}
        />

        {/* Role Selector */}
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            <div className="flex items-center gap-2">
              <Shield size={16} />
              Role
            </div>
          </label>
          <select
            id="role"
            {...register("role")}
            disabled={loading}
            className={`
              w-full px-4 py-2.5 rounded-lg border
              ${errors.role ? "border-red-500" : "border-slate-300"}
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              bg-white
              ${watch("role") === "" ? "text-slate-400" : "text-slate-900"}
            `}
          >
            <option value="" disabled>
              -- Select Role --
            </option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label} - {role.description}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
              {errors.role.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <FormInput
            {...register("password")}
            id="password"
            label="Password"
            placeholder="Create a strong password"
            icon={Lock}
            error={errors.password?.message}
            disabled={loading}
            showPasswordToggle
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        {/* Confirm Password Field */}
        <FormInput
          {...register("confirmPassword")}
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Re-enter your password"
          icon={Lock}
          error={errors.confirmPassword?.message}
          disabled={loading}
          showPasswordToggle
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          icon={UserPlus}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>

        {/* Divider */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-slate-500">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Signup */}
        <GoogleOAuthButton
          onClick={handleGoogleSignup}
          text="Sign up with Google"
        />

        {/* Login Link */}
        <div className="pt-4 text-center border-t border-slate-200">
          <p className="text-slate-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};
