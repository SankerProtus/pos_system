import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Warehouse,
  Users,
  BarChart2,
  UserCog,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../utils/cn";

const MENU_CONFIG = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    path: "/pos",
    label: "POS Terminal",
    icon: ShoppingCart,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
    badge: 3,
  },
  {
    path: "/sales",
    label: "Sales",
    icon: Receipt,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    path: "/products",
    label: "Products",
    icon: Package,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "/inventory",
    label: "Inventory",
    icon: Warehouse,
    roles: ["ADMIN", "MANAGER"],
    badge: 4,
  },
  {
    path: "/customers",
    label: "Customers",
    icon: Users,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    path: "/reports",
    label: "Reports",
    icon: BarChart2,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "/users",
    label: "Users",
    icon: UserCog,
    roles: ["ADMIN"],
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredMenu = MENU_CONFIG.filter((item) =>
    item.roles.includes(user?.role),
  );

  return (
    <aside className="h-screen w-55 bg-[#0f172a] border-r border-[#1e2d45] flex flex-col">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-[#1e2d45]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl font-bold text-slate-100">POS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span className="text-xl font-bold text-slate-100">SYSTEM</span>
        </div>
        <p className="text-[10px] text-slate-500 tracking-widest uppercase">
          MONO TERMINAL v1.0
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all group relative",
                  "hover:bg-indigo-900/20",
                  isActive
                    ? "text-indigo-400 bg-indigo-900/20"
                    : "text-slate-400",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.75 bg-indigo-400 rounded-r"></div>
                  )}
                  <Icon size={18} />
                  <span className="text-sm font-medium flex-1">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-400 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer - User Info */}
      <div className="px-4 py-4 border-t border-[#1e2d45]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 transition"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
