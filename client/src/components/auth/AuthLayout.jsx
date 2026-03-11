import { Link } from "react-router-dom";
import { Store, ShoppingCart } from "lucide-react";

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Store className="text-white" size={28} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-slate-800">RetailPOS</h1>
              <p className="text-xs text-slate-500 font-medium">Point of Sale System</p>
            </div>
          </Link>
          
          {/* Page Title */}
          {title && (
            <div className="mt-6">
              <h2 className="text-3xl font-bold text-slate-800">{title}</h2>
              {subtitle && (
                <p className="text-slate-600 mt-2 text-base">{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>
            © {new Date().getFullYear()} RetailPOS. All rights reserved.
          </p>
          <div className="mt-2 space-x-4">
            <Link to="/help" className="hover:text-blue-600 transition">
              Help
            </Link>
            <span className="text-slate-400">•</span>
            <Link to="/privacy" className="hover:text-blue-600 transition">
              Privacy
            </Link>
            <span className="text-slate-400">•</span>
            <Link to="/terms" className="hover:text-blue-600 transition">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
