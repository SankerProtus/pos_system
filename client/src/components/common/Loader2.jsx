// Loading Page/Spinner
import { Loader } from "lucide-react";

export const Loader2 = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-textSecondary">Loading...</p>
      </div>
    </div>
  );
};
