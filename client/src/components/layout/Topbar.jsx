import { useState, useEffect } from "react";

export const Topbar = ({ title, subtitle, actions }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <header className="h-15 bg-[#0f172a] border-b border-[#1e2d45] flex items-center px-6">
      {/* Left - Title */}
      <div className="flex-1">
        <h1 className="text-lg font-bold text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      {/* Right - Clock & Actions */}
      <div className="flex items-center gap-4">
        <div className="font-mono text-sm text-slate-400">
          {formatTime(currentTime)}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
};
