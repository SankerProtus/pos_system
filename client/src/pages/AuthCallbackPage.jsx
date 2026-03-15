import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { ROUTES, STORAGE_KEYS } from "../constants";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";

/**
 * Validates JWT token structure without verifying signature
 */
const isValidJWTStructure = (token) => {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 3;
};

export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in development (React StrictMode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        // Get tokens from URL params
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const refreshToken = params.get("refreshToken");
        const error = params.get("error");

        // Clear URL params immediately for security (remove tokens from browser history)
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );

        if (error) {
          toast.error("Google authentication failed. Please try again.");
          navigate(ROUTES.LOGIN);
          return;
        }

        if (!token || !isValidJWTStructure(token)) {
          toast.error("Authentication failed. Invalid token received.");
          navigate(ROUTES.LOGIN);
          return;
        }

        // Decode and validate token payload
        const payload = JSON.parse(atob(token.split(".")[1]));

        if (!payload.id || !payload.email || !payload.role) {
          toast.error("Authentication failed. Invalid token data.");
          navigate(ROUTES.LOGIN);
          return;
        }

        const user = {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: payload.role,
        };

        // Store tokens and user info
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        if (refreshToken && isValidJWTStructure(refreshToken)) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

        // Update auth context
        auth.login({ user, token });

        toast.success("Successfully logged in with Google!");
        navigate(ROUTES.DASHBOARD);
      } catch {
        toast.error("Authentication failed. Please try again.");
        navigate(ROUTES.LOGIN);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-blue-50">
      <div className="text-center">
        <Loader className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-600">Completing authentication...</p>
      </div>
    </div>
  );
};
