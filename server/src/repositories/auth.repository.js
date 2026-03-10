import { prisma } from "../lib/Prisma.js";

/**
 * Authentication Repository Layer
 */
export const authRepository = {
  // ============= USER OPERATIONS =============

  /**
   * Find user by email
   */
  findUserByEmail: async (email) => {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

  /**
   * Find user by ID
   */
  findUserById: async (userId) => {
    return await prisma.user.findUnique({
      where: { id: userId },
    });
  },

  /**
   * Find user by ID with specific fields
   */
  findUserByIdWithSelect: async (userId, select) => {
    return await prisma.user.findUnique({
      where: { id: userId },
      select,
    });
  },

  /**
   * Create a new user
   */
  createUser: async (userData) => {
    return await prisma.user.create({
      data: userData,
    });
  },

  /**
   * Update user
   */
  updateUser: async (userId, data) => {
    return await prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  /**
   * Update user by email
   */
  updateUserByEmail: async (email, data) => {
    return await prisma.user.update({
      where: { email },
      data,
    });
  },

  // ============= SESSION OPERATIONS =============

  /**
   * Create user session
   */
  createSession: async (sessionData) => {
    return await prisma.userSession.create({
      data: sessionData,
    });
  },

  /**
   * Find session by JTI
   */
  findSessionByJti: async (jti) => {
    return await prisma.userSession.findUnique({
      where: { jti },
    });
  },

  /**
   * Revoke session by JTI
   */
  revokeSessionByJti: async (jti) => {
    return await prisma.userSession.updateMany({
      where: { jti },
      data: { revokedAt: new Date() },
    });
  },

  /**
   * Revoke all user sessions
   */
  revokeAllUserSessions: async (userId) => {
    return await prisma.userSession.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  },

  // ============= EMAIL VERIFICATION OPERATIONS =============

  /**
   * Create verification record
   */
  createVerification: async (verificationData) => {
    return await prisma.verifyEmail.create({
      data: verificationData,
    });
  },

  /**
   * Find verification by user ID
   */
  findVerificationByUserId: async (userId) => {
    return await prisma.verifyEmail.findUnique({
      where: { userId },
    });
  },

  /**
   * Delete verification by user ID
   */
  deleteVerificationByUserId: async (userId) => {
    return await prisma.verifyEmail.delete({
      where: { userId },
    });
  },

  /**
   * Delete all verifications for a user
   */
  deleteAllVerificationsByUserId: async (userId) => {
    return await prisma.verifyEmail.deleteMany({
      where: { userId },
    });
  },

  // ============= PASSWORD RESET OPERATIONS =============

  /**
   * Create password reset record
   */
  createPasswordReset: async (resetData) => {
    return await prisma.passwordReset.create({
      data: resetData,
    });
  },

  /**
   * Find latest password reset by user ID
   */
  findLatestPasswordResetByUserId: async (userId) => {
    return await prisma.passwordReset.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Delete all password resets for a user
   */
  deleteAllPasswordResetsByUserId: async (userId) => {
    return await prisma.passwordReset.deleteMany({
      where: { userId },
    });
  },

  // ============= TRANSACTION OPERATIONS =============

  /**
   * Verify user account (transaction)
   */
  verifyUserAccountTransaction: async (email, userId) => {
    return await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { isVerified: true },
      }),
      prisma.verifyEmail.delete({
        where: { userId },
      }),
    ]);
  },

  /**
   * Reset password (transaction)
   */
  resetPasswordTransaction: async (email, userId, passwordHash) => {
    return await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash },
      }),
      prisma.passwordReset.deleteMany({
        where: { userId },
      }),
    ]);
  },
};
