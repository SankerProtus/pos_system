import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authApi } from "../api/auth.api";
import { showToast } from "../components/common/Toaster.jsx";
import { ROUTES, TOAST_MESSAGES , STORAGE_KEYS} from "../constants";

export const useAuth = () => {
    const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signup = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.signup(formData);

      const { accessToken, user } = data;
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      auth.login({ user, token: accessToken });
      showToast(TOAST_MESSAGES.SUCCESS.SIGNUP, "success");
      navigate(ROUTES.VERIFY_EMAIL);
    } catch (err) {
      setError(err.message || TOAST_MESSAGES.ERROR.SIGNUP_FAILED);
      showToast(err.message || TOAST_MESSAGES.ERROR.SIGNUP_FAILED, "error");
    } finally {
      setLoading(false);
    }
    };

    const login = async (formData) => {
        setLoading(true);
        setError(null);

        try {
            const data = await authApi.login(formData);
            const { accessToken, user } = data;
            localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            auth.login({ user, token: accessToken });
            showToast(TOAST_MESSAGES.SUCCESS.LOGIN, "success");
            navigate(ROUTES.DASHBOARD);
        } catch (err) {
            setError(err.message || TOAST_MESSAGES.ERROR.LOGIN_FAILED);
            showToast(err.message || TOAST_MESSAGES.ERROR.LOGIN_FAILED, "error");
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
            localStorage.removeItem(STORAGE_KEYS.USER);
            auth.logout();
            showToast(TOAST_MESSAGES.SUCCESS.LOGOUT, "success");
            navigate(ROUTES.LOGIN);
        } catch (err) {
            setError(err.message || TOAST_MESSAGES.ERROR.LOGOUT_FAILED);
            showToast(err.message || TOAST_MESSAGES.ERROR.LOGOUT_FAILED, "error");
        } finally {
            setLoading(false);
        }
    };

    const verifyEmail = async (token) => {
        setLoading(true);
        setError(null);
        try {
            await authApi.verifyEmail(token);
            showToast(TOAST_MESSAGES.SUCCESS.EMAIL_VERIFIED, "success");
            navigate(ROUTES.LOGIN);
        } catch (err) {
            setError(err.message || TOAST_MESSAGES.ERROR.VERIFICATION_FAILED);
            showToast(err.message || TOAST_MESSAGES.ERROR.VERIFICATION_FAILED, "error");
        } finally {
            setLoading(false);
        }
    };

    const resendVerification = async (email) => {
        setLoading(true);
        setError(null);
        try {
            await authApi.resendVerification(email);
            showToast(TOAST_MESSAGES.SUCCESS.VERIFICATION_CODE_SENT, "success");
        } catch (err) {
            setError(err.message || TOAST_MESSAGES.ERROR.VERIFICATION_FAILED);
            showToast(err.message || TOAST_MESSAGES.ERROR.VERIFICATION_FAILED, "error");
        } finally {
            setLoading(false);
        }
    };

    const forgotPassword = async (email) => {
        setLoading(true);
        setError(null);
        try {
            await authApi.forgotPassword(email);
            showToast(TOAST_MESSAGES.SUCCESS.PASSWORD_RESET_REQUEST, "success");
            navigate(`ROUTES.RESET_PASSWORD?email=${encodeURIComponent(email)}`);
        } catch (err) {
            setError(err.message || TOAST_MESSAGES.ERROR.PASSWORD_RESET_REQUEST_FAILED);
            showToast(err.message || TOAST_MESSAGES.ERROR.PASSWORD_RESET_REQUEST_FAILED, "error");
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (formData) => {
        setLoading(true);
        setError(null);
        try {
            await authApi.resetPassword(formData);
            showToast(TOAST_MESSAGES.SUCCESS.PASSWORD_RESET, "success");
            navigate(ROUTES.LOGIN);
        } catch (err) {
            setError(err.message || TOAST_MESSAGES.ERROR.PASSWORD_RESET_FAILED);
            showToast(err.message || TOAST_MESSAGES.ERROR.PASSWORD_RESET_FAILED, "error");
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = async (token) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authApi.googleLogin(token);
            const { accessToken, user } = data;
            localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            auth.login({ user, token: accessToken });
            showToast(TOAST_MESSAGES.SUCCESS.LOGIN, "success");
            navigate(ROUTES.DASHBOARD);
        } catch (err) {
            setError(err.message || TOAST_MESSAGES.ERROR.LOGIN_FAILED);
            showToast(err.message || TOAST_MESSAGES.ERROR.LOGIN_FAILED, "error");
        } finally {
            setLoading(false);
        }
    };

    return {
        authState: { isAuthenticated: auth.isAuthenticated, user: auth.user, token: auth.token },
        loading,
        error,
        signup,
        login,
        logout,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        googleLogin,
    };
};