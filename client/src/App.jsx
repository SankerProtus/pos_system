import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ResendVerificationPage,
  AuthCallbackPage,
} from "./pages/index.js";
import { Loader } from "./components/common/Loader.jsx";
import { ProtectedRoute } from "./components/layout/ProtectedRoute.jsx";
import { AppShell } from "./components/layout/AppShell.jsx";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage.jsx").then((module) => ({
    default: module.DashboardPage,
  })),
);
const POSPage = lazy(() =>
  import("./pages/POSPage.jsx").then((module) => ({
    default: module.POSPage,
  })),
);
const SalesPage = lazy(() =>
  import("./pages/SalesPage.jsx").then((module) => ({
    default: module.SalesPage,
  })),
);
const CustomersPage = lazy(() =>
  import("./pages/CustomersPage.jsx").then((module) => ({
    default: module.CustomersPage,
  })),
);
const ProductsPage = lazy(() =>
  import("./pages/ProductsPage.jsx").then((module) => ({
    default: module.ProductsPage,
  })),
);
const InventoryPage = lazy(() =>
  import("./pages/InventoryPage.jsx").then((module) => ({
    default: module.InventoryPage,
  })),
);
const ReportsPage = lazy(() =>
  import("./pages/ReportsPage.jsx").then((module) => ({
    default: module.ReportsPage,
  })),
);
const UsersPage = lazy(() =>
  import("./pages/UsersPage.jsx").then((module) => ({
    default: module.UsersPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage.jsx").then((module) => ({
    default: module.SettingsPage,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/resend-verification"
              element={<ResendVerificationPage />}
            />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected Routes with AppShell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pos" element={<POSPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/customers" element={<CustomersPage />} />

                {/* ADMIN & MANAGER Only */}
                <Route
                  element={
                    <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]} />
                  }
                >
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>

                {/* ADMIN Only */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Redirect root to dashboard */}
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#141d2e",
              color: "#f1f5f9",
              border: "1px solid #263548",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </QueryClientProvider>
    </>
  );
}

export default App;
