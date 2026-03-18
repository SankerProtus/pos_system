import { authService } from "../services/auth.service.js";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";
import passport from "passport";
import { authRepository } from "../repositories/auth.repository.js";
import { generateToken } from "../config/jwt.js";
import { prisma } from "../lib/Prisma.js";

// =============== Authentication Controller Layer =============== //
export const authController = {
  /**
   * User signup
   * POST /api/auth/signup
   */
  signup: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      const sessionData = {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"],
      };

      const result = await authService.createUser(
        { name, email, password, role },
        sessionData,
      );

      res.status(201).json({
        message:
          "User created successfully. Please check your email to verify your account.",
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error) {
      logger.error("Signup error:", error);

      if (error.message === "Account already exists") {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: "Something went wrong. Please try again later.",
      });
    }
  },
  /**
   * User login
   * POST /api/auth/login
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const sessionData = {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"],
      };

      const result = await authService.authenticateUser(
        email,
        password,
        sessionData,
      );

      res.status(200).json({
        message: "Login successful",
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error) {
      logger.error("Login error:", error.message);

      if (
        error.message === "Invalid credentials" ||
        error.message === "Account has been deactivated"
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: "Something went wrong. Please try again later.",
      });
    }
  },
  /**
   * Verify account
   * POST /api/auth/verify-account
   */
  verifyAccount: async (req, res) => {
    try {
      const { email, code } = req.body;

      await authService.verifyUserAccount(email, code);

      res.status(200).json({
        message: "Account verified successfully",
      });
    } catch (error) {
      logger.error("Verify account error:", error.message);

      if (
        error.message === "Account does not exist" ||
        error.message === "Account is already verified" ||
        error.message ===
          "No verification code found. Please request a new code." ||
        error.message === "The verification code is invalid" ||
        error.message === "Verification code has expired"
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: "Something went wrong. Please try again later.",
      });
    }
  },
  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await authRepository.findUserByEmail(email);

      if (!user) {
        return res.status(200).json({
          message:
            "If this email is registered, a verification code will be sent shortly.",
        });
      }

      if (user.isVerified) {
        return res.status(400).json({ error: "Account is already verified" });
      }

      await authService.sendVerificationCode(user.id);

      res.status(200).json({
        message: "Verification email sent successfully",
      });
    } catch (error) {
      logger.error("Resend verification error:", error.message);

      res.status(500).json({
        error: "Something went wrong. Please try again later.",
      });
    }
  },

  /**
   * Request password reset
   * POST /api/auth/password-reset-request
   */
  passwordResetRequest: async (req, res) => {
    try {
      const { email } = req.body;

      await authService.requestPasswordReset(email);

      res.status(200).json({
        message: "Password reset email sent successfully",
      });
    } catch (error) {
      logger.error("Password reset request error:", error.message);

      // Don't reveal if account doesn't exist for security
      res.status(200).json({
        message: "Password reset email sent successfully",
      });
    }
  },
  /**
   * Reset password
   * POST /api/auth/password-reset
   */
  passwordReset: async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      await authService.resetPassword(email, code, newPassword);

      res.status(200).json({
        message:
          "Password reset successfully. Please login with your new password.",
      });
    } catch (error) {
      logger.error("Password reset error:", error.message);

      if (
        error.message === "Account does not exist" ||
        error.message ===
          "No password reset request found. Please request a new password reset." ||
        error.message === "The password reset code is invalid" ||
        error.message === "Password reset code has expired"
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: "Something went wrong. Please try again later.",
      });
    }
  },
  /**
   * Logout
   * POST /api/auth/logout
   */
  logout: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
      }

      // Decode token to get jti (ignore expiration)
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        { ignoreExpiration: true },
      );

      if (decoded.jti) {
        await authService.revokeSession(decoded.jti);
      }

      res.status(200).json({
        message: "Logged out successfully",
      });
    } catch (error) {
      logger.error("Logout error:", error.message);

      res.status(500).json({
        error: "Something went wrong. Please try again later.",
      });
    }
  },
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token is required" });
      }

      // Verify the refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
      );

      // Check if session exists and is not revoked
      const session = await prisma.userSession.findUnique({
        where: { jti: decoded.jti },
      });

      if (!session || session.revokedAt) {
        return res.status(401).json({ error: "Session has been revoked" });
      }

      // Get fresh user data
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: "User not found or inactive" });
      }

      // Generate new tokens
      const tokens = generateToken(user);

      res.status(200).json({
        message: "Token refreshed successfully",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      logger.error("Error occurred while refreshing token:", error);

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid refresh token" });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Refresh token has expired" });
      }

      res.status(500).json({
        error: "Hmm... Something went wrong. Please try again later.",
      });
    }
  },

  /**
   * Google OAuth - Not implemented
   * GET /api/auth/google
   */
  googleAuthController: passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),

  /**
   * Google OAuth Callback - Not implemented
   * GET /api/auth/google/callback
   */
  googleAuthCallback: async (req, res, next) => {
    passport.authenticate(
      "google",
      { session: false },
      async (err, user, info) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

        if (err) {
          logger.error("Google authentication error:", err.message || err);
          return res.redirect(`${frontendUrl}/auth/callback?error=authentication_failed`);
        }

        if (!user) {
          return res.redirect(`${frontendUrl}/auth/callback?error=user_not_found`);
        }

        // Generate tokens for the authenticated user
        const { accessToken, refreshToken, jti } = generateToken(user);
        // Create user session
        await authRepository.createSession({
          userId: user.id,
          jti,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers["user-agent"],
        });

        // Redirect to frontend with tokens as URL params
        const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;

        res.redirect(redirectUrl);
      },
    )(req, res, next);
  },
};
