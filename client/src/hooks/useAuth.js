import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authApi } from "../api/auth.api";
import toast from "react-hot-toast";
import { ROUTES, TOAST_MESSAGES, STORAGE_KEYS } from "../constants";

export const useAuth = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signup = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      // Transform data for backend - only send name, email, password
      const payload = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      const data = await authApi.signup(payload);

      const { accessToken, refreshToken, user } = data;
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      auth.login({ user, token: accessToken, refreshToken });
      toast.success(TOAST_MESSAGES.SUCCESS.SIGNUP);
      navigate(
        `${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(formData.email)}`,
      );
    } catch (err) {
      // Handle validation errors with details
      console.error("Signup error details:", err);

      const errorMessage = err.details
        ? err.details.map((d) => `${d.path || d.param}: ${d.msg}`).join(", ")
        : err.error || err.message || TOAST_MESSAGES.ERROR.SIGNUP_FAILED;

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const login = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.login(formData);

      const { accessToken, refreshToken, user } = data;
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      auth.login({ user, token: accessToken, refreshToken });
      toast.success(TOAST_MESSAGES.SUCCESS.LOGIN);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      console.error("Login error details:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.error ||
        err.message ||
        TOAST_MESSAGES.ERROR.LOGIN_FAILED;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.logout();
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      auth.logout();
      toast.success(TOAST_MESSAGES.SUCCESS.LOGOUT);
      navigate(ROUTES.LOGIN);
    } catch (err) {
      // Clear local storage even if logout request fails
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      auth.logout();

      console.error("Logout error:", err);
      const errorMessage =
        err.error || err.message || TOAST_MESSAGES.ERROR.LOGOUT_FAILED;
      setError(errorMessage);
      toast.error(errorMessage);
      navigate(ROUTES.LOGIN);
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyEmail(token);
      toast.success(TOAST_MESSAGES.SUCCESS.EMAIL_VERIFIED);
      navigate(ROUTES.LOGIN);
    } catch (err) {
      console.error("Verify email error:", err);
      const errorMessage =
        err.error || err.message || TOAST_MESSAGES.ERROR.VERIFICATION_FAILED;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async (email) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.resendVerification(email);
      toast.success(TOAST_MESSAGES.SUCCESS.VERIFICATION_CODE_SENT);
    } catch (err) {
      console.error("Resend verification error:", err);
      const errorMessage =
        err.error || err.message || TOAST_MESSAGES.ERROR.VERIFICATION_FAILED;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      toast.success(TOAST_MESSAGES.SUCCESS.PASSWORD_RESET_REQUEST);
      navigate(`${ROUTES.RESET_PASSWORD}?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error("Forgot password error:", err);
      const errorMessage =
        err.error ||
        err.message ||
        TOAST_MESSAGES.ERROR.PASSWORD_RESET_REQUEST_FAILED;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(formData);
      toast.success(TOAST_MESSAGES.SUCCESS.PASSWORD_RESET);
      navigate(ROUTES.LOGIN);
    } catch (err) {
      console.error("Reset password error:", err);
      const errorMessage =
        err.error || err.message || TOAST_MESSAGES.ERROR.PASSWORD_RESET_FAILED;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    token: auth.token,
    refreshToken: auth.refreshToken,
    loading,
    error,
    signup,
    login,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    refreshUser: auth.refreshUser,
    updateAuthenticatedUser: auth.updateAuthenticatedUser,
  };
};
