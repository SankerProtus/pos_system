import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "../schemas/authSchema.js";
import { Link } from "react-router-dom";
import { Mail, Send, CheckCircle } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { FormInput, Button, Alert } from "../components/common";
import { authApi } from "../api/auth.api";

export const ForgotPasswordPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");

    try {
      await authApi.forgotPassword(data.email);
      setSuccess(true);
    } catch (err) {
      setError(
        err.message || "Failed to send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="We've sent you a password reset link"
      >
        <div className="space-y-6">
          {/* Success Icon */}
          <div className="text-center py-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <p className="text-slate-600">
              If an account exists with{" "}
              <span className="font-semibold text-slate-800">
                {getValues("email")}
              </span>
              , you will receive a password reset link shortly.
            </p>
          </div>

          {/* Info Alert */}
          <Alert
            type="info"
            message="Please check your email inbox and spam folder. The link will expire in 1 hour."
          />

          {/* Back to Login */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => (window.location.href = "/login")}
          >
            Back to Login
          </Button>

          {/* Resend Link */}
          <div className="text-center">
            <button
              onClick={() => setSuccess(false)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
            >
              Didn't receive the email? Try again
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Enter your email to reset your password"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Info Alert */}
        <Alert
          type="info"
          message="Enter the email address associated with your account and we'll send you a link to reset your password."
        />

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
          autoFocus
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          icon={Send}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>

        {/* Back to Login */}
        <div className="pt-4 text-center border-t border-slate-200">
          <Link
            to="/login"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
          >
            ← Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
