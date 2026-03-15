import axios from "axios";
import { STORAGE_KEYS } from "../constants";

// Use environment variable for API base URL, fallback to localhost:8080
const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error Response:", {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });

      // Log validation errors in detail
      if (error.response.status === 400 && error.response.data.details) {
        console.error("Validation Error Details:", error.response.data.details);
      }

      // Handle specific status codes
      // Don't auto-redirect on 401 during login/signup attempts
      const isAuthEndpoint = error.config?.url?.includes("/auth/");

      if (error.response.status === 401 && !isAuthEndpoint) {
        // Handle unauthorized access - redirect to login
        console.warn(
          "Unauthorized access, clearing auth data and redirecting to login",
        );
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);

        // Avoid infinite redirect loops
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }

      if (error.response.status === 403) {
        console.error("Access denied:", error.response.data);
      }

      if (error.response.status === 500) {
        console.error("Server error:", error.response.data);
      }
    } else if (error.request) {
      // Handle network errors
      console.error("Network error - no response received:", error.message);
    } else {
      // Handle other errors
      console.error("Request setup error:", error.message);
    }

    return Promise.reject(error);
  },
);
