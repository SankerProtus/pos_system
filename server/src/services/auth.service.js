import bcrypt from "bcrypt";
import { authRepository } from "../repositories/auth.repository.js";
import { generateToken } from "../config/jwt.js";
import { emailService } from "../email/services/email.service.js";
import { logger } from "../utils/logger.js";

const SALT_ROUNDS = 12;
const VERIFICATION_CODE_EXPIRY = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Authentication Service Layer
 */

export const authService = {
  /**
   * Create a new user account
   */
  createUser: async (userData, sessionData = {}) => {
    const { name, email, password, role = "CASHIER" } = userData;

    // Check if user already exists
    const existingUser = await authRepository.findUserByEmail(email);

    if (existingUser) {
      throw new Error("Account already exists");
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user
    const user = await authRepository.createUser({
      name,
      email,
      passwordHash,
      role,
      isActive: true,
      isVerified: false,
    });

    // Generate tokens
    const { accessToken, refreshToken, jti } = generateToken(user);

    // Create session
    await authRepository.createSession({
      userId: user.id,
      jti,
      expiresAt: new Date(Date.now() + SESSION_EXPIRY),
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
    });

    // Send verification email
    await emailService.sendVerificationEmail(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  },

  /**
   * Authenticate user with credentials
   */
  authenticateUser: async (email, password, sessionData = {}) => {
    // Find the user by email
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error("Account has been deactivated");
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await authRepository.updateUser(user.id, { lastLoginAt: new Date() });

    // Generate tokens
    const { accessToken, refreshToken, jti } = generateToken(user);

    // Create session
    await authRepository.createSession({
      userId: user.id,
      jti,
      expiresAt: new Date(Date.now() + SESSION_EXPIRY),
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  },

  /**
   * Verify user account with verification code
   */
  verifyUserAccount: async (email, code) => {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error("Account does not exist");
    }

    if (user.isVerified) {
      throw new Error("Account is already verified");
    }

    const verificationRecord = await authRepository.findVerificationByUserId(
      user.id,
    );

    if (!verificationRecord) {
      throw new Error("No verification code found. Please request a new code.");
    }

    if (verificationRecord.verificationCode !== code) {
      throw new Error("The verification code is invalid");
    }

    if (verificationRecord.verificationCodeExpires < new Date()) {
      throw new Error("Verification code has expired");
    }

    // Mark user as verified and delete verification record
    await authRepository.verifyUserAccountTransaction(email, user.id);

    // Send welcome email
    await emailService.sendWelcomeEmail(user);

    return user;
  },

  /**
   * Generate and send verification code
   */
  sendVerificationCode: async (userId) => {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isVerified) {
      throw new Error("Account is already verified");
    }

    // Delete any existing verification codes
    await authRepository.deleteAllVerificationsByUserId(user.id);

    // Generate a random 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Save the verification code in the database
    await authRepository.createVerification({
      userId: user.id,
      verificationCode: code,
      verificationCodeExpires: new Date(Date.now() + VERIFICATION_CODE_EXPIRY),
    });

    // Send verification email
    await emailService.sendVerificationEmail(user);

    return true;
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email) => {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error("Account does not exist");
    }

    // Generate a random 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Delete any existing reset codes
    await authRepository.deleteAllPasswordResetsByUserId(user.id);

    // Save the reset code in the database
    await authRepository.createPasswordReset({
      userId: user.id,
      passwordResetCode: code,
      passwordResetCodeExpires: new Date(Date.now() + VERIFICATION_CODE_EXPIRY),
    });

    // Send password reset email
    await emailService.sendPasswordResetEmail(user, code);

    return true;
  },

  /**
   * Reset password with verification code
   */
  resetPassword: async (email, code, newPassword) => {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error("Account does not exist");
    }

    const resetRecord = await authRepository.findLatestPasswordResetByUserId(
      user.id,
    );

    if (!resetRecord) {
      throw new Error(
        "No password reset request found. Please request a new password reset.",
      );
    }

    if (resetRecord.passwordResetCode !== code) {
      throw new Error("The password reset code is invalid");
    }

    if (resetRecord.passwordResetCodeExpires < new Date()) {
      throw new Error("Password reset code has expired");
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password and delete reset record
    await authRepository.resetPasswordTransaction(email, user.id, passwordHash);

    // Revoke all sessions to force re-login
    await authRepository.revokeAllUserSessions(user.id);

    return user;
  },

  /**
   * Validate and decode JWT token
   */
  validateToken: async (token, secret) => {
    try {
      const jwt = await import("jsonwebtoken");
      const decoded = jwt.verify(token, secret);

      // Check if session exists and is not revoked (if jti exists)
      if (decoded.jti) {
        const session = await authRepository.findSessionByJti(decoded.jti);

        if (!session || session.revokedAt) {
          throw new Error("Session has been revoked");
        }

        if (session.expiresAt < new Date()) {
          throw new Error("Session has expired");
        }
      }

      return decoded;
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
      }
      if (error.name === "TokenExpiredError") {
        throw new Error("Token has expired");
      }
      throw error;
    }
  },

  /**
   * Revoke user session (logout)
   */
  revokeSession: async (jti) => {
    if (!jti) {
      return false;
    }

    await authRepository.revokeSessionByJti(jti);
    return true;
  },

  /**
   * Refresh access token
   */
  refreshAccessToken: async (refreshToken, sessionData = {}) => {
    // Validate refresh token
    const decoded = await authService.validateToken(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    // Get fresh user data
    const user = await authRepository.findUserById(decoded.id);

    if (!user || !user.isActive) {
      throw new Error("User not found or inactive");
    }

    // Generate new tokens
    const tokens = generateToken(user);

    // Create new session
    await authRepository.createSession({
      userId: user.id,
      jti: tokens.jti,
      expiresAt: new Date(Date.now() + SESSION_EXPIRY),
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
    });

    return {
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId) => {
    const user = await authRepository.findUserByIdWithSelect(userId, {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isActive) {
      throw new Error("Account has been deactivated");
    }

    return user;
  },

  /**
   * Change user password (authenticated user)
   */
  changePassword: async (userId, currentPassword, newPassword) => {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await authRepository.updateUser(userId, { passwordHash });

    // Revoke all sessions to force re-login
    await authRepository.revokeAllUserSessions(userId);

    return true;
  },

  /**
   * Update user profile
   */
  updateUserProfile: async (userId, updates) => {
    const allowedFields = ["name", "pin"];
    const filteredUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error("No valid fields to update");
    }

    const user = await authRepository.findUserByIdWithSelect(userId, {
      id: true,
      name: true,
      email: true,
      role: true,
      pin: true,
      isActive: true,
      isVerified: true,
    });

    await authRepository.updateUser(userId, filteredUpdates);

    return { ...user, ...filteredUpdates };
  },
};
