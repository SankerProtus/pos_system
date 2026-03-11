import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthProvider.jsx";
import { ToastContainer, Zoom } from "react-toastify";

export const AppProviders = ({ children }) => {
    return (
        <AuthProvider>
            <BrowserRouter>
                {children}
                <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={true}
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                transition={Zoom}
                />
            </BrowserRouter>
        </AuthProvider>
    );
};