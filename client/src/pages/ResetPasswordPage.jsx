import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, KeyRound, CheckCircle } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { FormInput, Button, Alert } from "../components/common";
import { authApi } from "../api/auth.api";
import toast from "react-hot-toast";

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromUrl = searchParams.get("email");

  const [resetCode, setResetCode] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCodeChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...resetCode];
    newCode[index] = value.slice(-1); // Only take the last digit
    setResetCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace to move to previous input
    if (e.key === "Backspace" && !resetCode[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate email
    if (!emailFromUrl) {
      setError("Email address is missing. Please use the link from your email.");
      return;
    }

    // Validate code
    const code = resetCode.join("");
    if (code.length !== 4) {
      setError("Please enter the complete 4-digit reset code.");
      return;
    }

    // Validate passwords
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      console.log("Resetting password:", { email: emailFromUrl, code, newPassword });
      
      await authApi.resetPassword({
        email: emailFromUrl,
        code,
        newPassword,
      });

      setSuccess(true);
      toast.success("Password reset successful! Redirecting to login...");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Password reset error:", err);
      
      const errorMessage = err.details 
        ? err.details.map(d => `${d.path}: ${d.msg}`).join(", ")
        : err.error || err.message || "Invalid reset code. Please try again.";
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Password Reset Successful!"
        subtitle="Your password has been updated"
      >
        <div className="space-y-6">
          {/* Success Icon */}
          <div className="text-center py-8">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            <p className="text-slate-600 text-lg">
              You can now login with your new password.
            </p>
          </div>

          {/* Login Button */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate("/login")}
          >
            Go to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Enter the code from your email and your new password"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Alert */}
        <Alert
          type="info"
          message={`Enter the 4-digit code sent to ${emailFromUrl || "your email"} and choose a new password.`}
        />

        {/* Error Alert */}
        {error && <Alert type="error" message={error} />}

        {/* Email Display (read-only) */}
        {emailFromUrl && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600">
              Resetting password for:{" "}
              <span className="font-semibold text-slate-800">
                {emailFromUrl}
              </span>
            </p>
          </div>
        )}

        {/* Reset Code Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Reset Code
          </label>
          <div className="flex gap-3 justify-center">
            {resetCode.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-14 text-center text-2xl font-semibold border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:bg-slate-100"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>

        {/* New Password Field */}
        <FormInput
          id="newPassword"
          label="New Password"
          type="password"
          placeholder="Enter new password"
          icon={Lock}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
        />

        {/* Confirm Password Field */}
        <FormInput
          id="confirmPassword"
          label="Confirm New Password"
          type="password"
          placeholder="Confirm new password"
          icon={Lock}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          icon={KeyRound}
        >
          {loading ? "Resetting Password..." : "Reset Password"}
        </Button>

        {/* Back to Login / Request New Code */}
        <div className="pt-4 space-y-3 text-center border-t border-slate-200">
          <Link
            to="/login"
            className="block text-sm text-blue-600 hover:text-blue-700 font-medium transition"
          >
            ← Back to Login
          </Link>
          <Link
            to="/forgot-password"
            className="block text-sm text-slate-600 hover:text-slate-700 transition"
          >
            Didn't receive a code? Request a new one
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
