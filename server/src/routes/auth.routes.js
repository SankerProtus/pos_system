import express from "express";
import { authController } from "../controllers/auth.controller.js";
import { authRateLimiter, loginRateLimiter } from "../utils/rateLimiter.js";
import {
  validateUserRegistration,
  validateUserLogin,
  validateEmailVerification,
  validateResendVerification,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateRefreshToken,
  validateLogout,
} from "../validators/auth.validator.js";

export const authRoutes = express.Router();

// Public routes - no authentication required
authRoutes.post(
  "/signup",
  validateUserRegistration,
  authRateLimiter,
  authController.signup,
);

authRoutes.post(
  "/login",
  validateUserLogin,
  loginRateLimiter,
  authController.login,
);

authRoutes.post(
  "/verify-account",
  validateEmailVerification,
  authRateLimiter,
  authController.verifyAccount,
);

authRoutes.post(
  "/resend-verification",
  validateResendVerification,
  authRateLimiter,
  authController.resendVerification,
);

authRoutes.post(
  "/password-reset-request",
  validatePasswordResetRequest,
  authRateLimiter,
  authController.passwordResetRequest,
);

authRoutes.post(
  "/password-reset",
  validatePasswordReset,
  authRateLimiter,
  authController.passwordReset,
);

authRoutes.post(
  "/refresh-token",
  validateRefreshToken,
  authController.refreshToken,
);

authRoutes.post(
  "/logout",
  validateLogout,
  authController.logout,
);

// Google OAuth routes
authRoutes.get("/google", authController.googleAuthController);

authRoutes.get("/google/callback", authController.googleAuthCallback);
