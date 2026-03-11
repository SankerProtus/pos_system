import React from "react";
export const Loader = (props) => {
  const { size = "md", fullScreen = false, text, className = "" } = props;

  const sizes = {
    sm: "w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin",
    md: "w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin",
    lg: "w-12 h-12 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin",
  };

  const Spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizes[size]} border-gray-200 border-t-primary-600 rounded-full animate-spin ${className}`}
      ></div>
      {text && <p className="text-gray-600 text-md">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        {Spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-8">{Spinner}</div>;
};
