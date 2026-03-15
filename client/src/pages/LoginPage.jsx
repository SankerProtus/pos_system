import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import { loginSchema } from "../schemas/authSchema.js";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import {
  FormInput,
  Button,
  GoogleOAuthButton,
  Alert,
} from "../components/common";

export const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const { login, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const onSubmit = async (data) => {
    await login({ ...data, rememberMe });
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Passport OAuth endpoint
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your POS system"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Error Alert */}
        {error && <Alert type="error" message={error} />}

        {/* Email Field */}
        <FormInput
          {...register("email")}
          id="email"
          label="Email Address"
          type="email"
          placeholder="your.email@store.com"
          icon={Mail}
          error={errors.email?.message}
          disabled={loading}
        />

        {/* Password Field */}
        <FormInput
          {...register("password")}
          id="password"
          label="Password"
          placeholder="Enter your password"
          icon={Lock}
          error={errors.password?.message}
          disabled={loading}
          showPasswordToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-slate-700 group-hover:text-slate-900">
              Remember me
            </span>
          </label>
          <Link
            to="/forgot-password"
            className="text-blue-600 hover:text-blue-700 font-medium transition"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          icon={LogIn}
        >
          {loading ? "Signing in..." : "Sign In"}
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

        {/* Google Login */}
        <GoogleOAuthButton onClick={handleGoogleLogin} />

        {/* Register Link */}
        <div className="pt-4 text-center border-t border-slate-200">
          <p className="text-slate-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Create Account
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};
