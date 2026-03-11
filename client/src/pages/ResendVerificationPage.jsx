import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resendVerificationEmailSchema } from "../schemas/authSchema.js";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Send, CheckCircle } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { FormInput, Button, Alert } from "../components/common";
import { authApi } from "../api/auth.api";

export const ResendVerificationPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({
    resolver: zodResolver(resendVerificationEmailSchema),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    if (cooldown > 0) return;

    setLoading(true);
    setError("");

    try {
      await authApi.resendVerification(data.email);
      setSuccess(true);
      
      // Set cooldown to prevent spam (60 seconds)
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(
        err.message || "Failed to resend verification email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToVerify = () => {
    const email = getValues("email");
    navigate(`/verify-email?email=${encodeURIComponent(email)}`);
  };

  if (success) {
    return (
      <AuthLayout
        title="Email Sent!"
        subtitle="Check your inbox for the verification code"
      >
        <div className="space-y-6">
          {/* Success Icon */}
          <div className="text-center py-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <p className="text-slate-600">
              We've sent a new verification code to{" "}
              <span className="font-semibold text-slate-800">
                {getValues("email")}
              </span>
            </p>
          </div>

          {/* Info Alert */}
          <Alert
            type="info"
            message="Please check your email inbox and spam folder. The verification code will expire in 15 minutes."
          />

          {/* Go to Verify Button */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleGoToVerify}
          >
            Enter Verification Code
          </Button>

          {/* Resend Again */}
          {cooldown > 0 && (
            <div className="text-center">
              <p className="text-sm text-slate-500">
                You can request another code in{" "}
                <span className="font-semibold text-slate-700">{cooldown}s</span>
              </p>
            </div>
          )}

          {cooldown === 0 && (
            <div className="text-center">
              <button
                onClick={() => setSuccess(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
              >
                Didn't receive it? Send again
              </button>
            </div>
          )}

          {/* Back to Login */}
          <div className="pt-4 text-center border-t border-slate-200">
            <Link
              to="/login"
              className="text-sm text-slate-600 hover:text-slate-700 transition"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Resend Verification"
      subtitle="Get a new verification code sent to your email"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Info Alert */}
        {!error && (
          <Alert
            type="info"
            message="Enter your email address and we'll send you a new verification code."
          />
        )}

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
          disabled={loading || cooldown > 0}
          autoFocus
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={cooldown > 0}
          icon={Send}
        >
          {cooldown > 0
            ? `Wait ${cooldown}s`
            : loading
            ? "Sending..."
            : "Send Verification Email"}
        </Button>

        {/* Already have a code? */}
        <div className="text-center">
          <p className="text-sm text-slate-600">
            Already have a code?{" "}
            <Link
              to="/verify-email"
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Enter it here
            </Link>
          </p>
        </div>

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
