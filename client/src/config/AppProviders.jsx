import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthProvider.jsx";

export const AppProviders = ({ children }) => {
    return (
        <AuthProvider>
            <BrowserRouter>
                {children}
            </BrowserRouter>
        </AuthProvider>
    );
};