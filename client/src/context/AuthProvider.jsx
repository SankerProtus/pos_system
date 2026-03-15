import { useState } from "react";
import { AuthContext } from "./AuthContext";
import { STORAGE_KEYS } from "../constants";

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage to persist auth state across page refreshes
  const [authState, setAuthState] = useState(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        return {
          isAuthenticated: true,
          user,
          token,
          refreshToken,
        };
      } catch (error) {
        // If parsing fails, clear invalid data
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }

    return {
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
    };
  });

  const login = (userData) => {
    setAuthState({
      isAuthenticated: true,
      user: userData.user,
      token: userData.token,
      refreshToken: userData.refreshToken,
    });
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
