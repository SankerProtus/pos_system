import { useState } from "react";
import { cn } from "../../utils/cn";
import { resolveMediaUrl } from "../../utils/resolveMediaUrl";

export const UserAvatar = ({
  name,
  imageUrl,
  className = "",
  fallbackClassName = "",
}) => {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const resolvedImageUrl = resolveMediaUrl(imageUrl);

  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const shouldShowImage =
    Boolean(resolvedImageUrl) && failedImageUrl !== resolvedImageUrl;

  if (shouldShowImage) {
    return (
      <img
        src={resolvedImageUrl}
        alt={`${name || "User"} profile`}
        className={cn("rounded-full object-cover", className)}
        onError={() => setFailedImageUrl(resolvedImageUrl)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold",
        fallbackClassName,
        className,
      )}
      aria-label={`${name || "User"} avatar`}
    >
      {initial}
    </div>
  );
};
