const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const normalizedApiBase = API_BASE_URL.replace(/\/+$/, "");
const backendOrigin = normalizedApiBase.replace(/\/api\/?$/, "");

export const resolveMediaUrl = (value) => {
  if (!value) {
    return "";
  }

  const url = String(value).trim();

  if (!url) {
    return "";
  }

  if (/^(?:https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${backendOrigin}${url}`;
  }

  return url;
};
