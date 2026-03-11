import { useState } from "react";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        user: null,
        token: null,
    });

    const login = (userData) => {
        setAuthState({
            isAuthenticated: true,
            user: userData.user,
            token: userData.token,
        });
    }

    const logout = () => {
        setAuthState({
            isAuthenticated: false,
            user: null,
            token: null,
        });
    }

    return (
        <AuthContext.Provider value={{ ...authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};