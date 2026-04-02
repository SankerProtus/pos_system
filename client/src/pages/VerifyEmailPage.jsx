import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle, RefreshCw } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Button, Alert } from "../components/common";
import { authApi } from "../api/auth.api";
import toast from "react-hot-toast";

const CODE_LENGTH = 4;

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef([]);
  const navigate = useNavigate();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take the last character
    setCode(newCode);
    setError("");

    // Move to next input if value is entered
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, CODE_LENGTH);

    if (!/^\d+$/.test(pastedData)) {
      setError("Please paste only numbers");
      return;
    }

    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);

    // Focus on the next empty input or the last input
    const nextEmptyIndex = newCode.findIndex((val) => !val);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[CODE_LENGTH - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const verificationCode = code.join("");

    if (verificationCode.length !== CODE_LENGTH) {
      setError(`Please enter all ${CODE_LENGTH} digits`);
      return;
    }

    if (!emailFromUrl) {
      setError(
        "Email address is missing. Please use the link from your email.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {

      await authApi.verifyEmail({
        email: emailFromUrl,
        code: verificationCode,
      });

      setSuccess(true);
      toast.success("Email verified successfully!");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Verification error:", err);

      // Handle validation errors with details
      const errorMessage = err.details
        ? err.details.map((d) => `${d.path}: ${d.msg}`).join(", ")
        : err.error ||
          err.message ||
          "Invalid verification code. Please try again.";

      setError(errorMessage);
      // Clear the code on error
      setCode(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || !emailFromUrl) return;

    setResendLoading(true);
    setError("");

    try {
      await authApi.resendVerification(emailFromUrl);
      toast.success("Verification code sent to your email!");
      setCanResend(false);
      setCountdown(60);
      // Clear the code
      setCode(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || "Failed to resend verification code");
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Email Verified!"
        subtitle="Redirecting you to login..."
      >
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <p className="text-slate-600">
            Your email has been successfully verified. You can now sign in to
            your account.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle={`Enter the ${CODE_LENGTH}-digit code sent to ${emailFromUrl || "your email"}`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Alert */}
        {!error && (
          <Alert
            type="info"
            message={`We've sent a ${CODE_LENGTH}-digit verification code to your email address.`}
          />
        )}

        {/* Error Alert */}
        {error && <Alert type="error" message={error} />}

        {/* Email Display */}
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
          <Mail size={16} />
          <span className="font-medium">{emailFromUrl || "your email"}</span>
        </div>

        {/* Code Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
            Verification Code
          </label>
          <div className="flex gap-3 justify-center">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={loading}
                className="w-14 h-14 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Verify Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={code.join("").length !== CODE_LENGTH}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </Button>

        {/* Resend Code */}
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-600">Didn't receive the code?</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResendCode}
            loading={resendLoading}
            disabled={!canResend || resendLoading}
            icon={RefreshCw}
          >
            {countdown > 0
              ? `Resend in ${countdown}s`
              : resendLoading
                ? "Sending..."
                : "Resend Code"}
          </Button>
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
