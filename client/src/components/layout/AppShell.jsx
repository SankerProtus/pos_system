import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const AppShell = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
