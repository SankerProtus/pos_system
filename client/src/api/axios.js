import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific status codes
      switch (error.response.status) {
        case 401:
            // Handle unauthorized access - redirect to login
            localStorage.removeItem("token");
            window.location.href = "/login";
            break;
        case 403:
            // Handle forbidden access
            console.error("Access denied:", error.response.data);
            break;
        case 500:
            // Handle server errors
            console.error("Server error:", error.response.data);
            break;
        default:
            // Handle other errors
            console.error("Error:", error.response.data);
            break;
      }
    } else if (error.request) {
      // Handle network errors
      console.error("Network error:", error.message);
    } else {
      // Handle other errors
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
    }
);
