// API endpoints constants
export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: "/auth/signup",
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    VERIFY_EMAIL: "/auth/verify-account",
    RESEND_VERIFICATION: "/auth/resend-verification",
    FORGOT_PASSWORD: "/auth/password-reset-request",
    RESET_PASSWORD: "/auth/password-reset",
    GOOGLE_LOGIN: "/auth/google",
  },
  DASHBOARD: {
    GET_DAILY: "/reports/daily?date=:date",
    GET_WEEKLY: "/reports/weekly",
    GET_SALES: "/sales?limit=5&status=COMPLETED",
  },
  USERS: {
    GET_PROFILE: "/users/profile",
    UPDATE_PROFILE: "/users/profile",
  },
};

// App routes constants
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  VERIFY_EMAIL: "/verify-email",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/dashboard",
  ABOUT: "/about",
  BLOG: "/blog",
  CONTACT: "/contact",
  RESOURCES: "/resources",
};

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: "token",
  REFRESH_TOKEN: "refreshToken",
  USER: "user",
};

// Toast messages
export const TOAST_MESSAGES = {
  SUCCESS: {
    LOGIN: "Login successful!",
    SIGNUP: "Signup successful!",
    LOGOUT: "Logged out successfully!",
    EMAIL_VERIFIED: "Email verified successfully!",
    PASSWORD_RESET: "Password reset successful!",
    VERIFICATION_CODE_SENT: "Verification code sent successfully!",
  },
  ERROR: {
    LOGIN_FAILED: "Login failed. Please try again.",
    LOGOUT_FAILED: "Logout failed. Please try again.",
    SIGNUP_FAILED: "Signup failed. Please try again.",
    PASSWORD_RESET_REQUEST_FAILED:
      "Failed to send reset code. Please try again.",
    PASSWORD_RESET_FAILED: "Failed to reset password. Please try again.",
    VERIFICATION_FAILED: "Failed to resend verification code.",
    EMAIL_VERIFICATION_FAILED: "Email verification failed. Please try again.",
    NETWORK_ERROR: "Network error. Please check your connection.",
    UNAUTHORIZED: "You are not authorized to access this resource.",
  },
};
