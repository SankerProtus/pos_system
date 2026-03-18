import jwt from "jsonwebtoken";
import { authRepository } from "../repositories/auth.repository.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware to verify JWT access token
 * Attaches user data to req.user if valid
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Access token is required" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Check if session exists and is not revoked (if jti exists)
    if (decoded.jti) {
      const session = await authRepository.findSessionByJti(decoded.jti);

      if (!session) {
        return res.status(401).json({ error: "Session not found" });
      }

      if (session.revokedAt) {
        return res
          .status(401)
          .json({ error: "Session has been revoked. Please login again." });
      }

      if (session.expiresAt < new Date()) {
        return res
          .status(401)
          .json({ error: "Session has expired. Please login again." });
      }
    }

    // Get user from database
    const user = await authRepository.findUserByIdWithSelect(decoded.id, {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isVerified: true,
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account has been deactivated" });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error(
      "Error in authenticateToken middleware:", error,
    );

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid access token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token has expired" });
    }

    res.status(500).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware to verify refresh token
 * Used specifically for token refresh endpoint
 */
export const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token is required" });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Check if session exists and is not revoked
    if (decoded.jti) {
      const session = await authRepository.findSessionByJti(decoded.jti);

      if (!session || session.revokedAt) {
        return res.status(401).json({ error: "Session has been revoked" });
      }
    }

    // Get user from database
    const user = await authRepository.findUserById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = user;
    req.tokenData = decoded;
    next();
  } catch (error) {
    logger.error(
      "Error in authenticateRefreshToken middleware:",
      error.message || error,
    );

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Refresh token has expired" });
    }

    res.status(500).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware to check if user is verified
 * Must be used after authenticateToken
 */
export const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.user.isVerified) {
    return res
      .status(403)
      .json({ error: "Please verify your email address to continue" });
  }

  next();
};

/**
 * Middleware to check if user has required role
 * Must be used after authenticateToken
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
        requiredRole: allowedRoles,
        currentRole: req.user.role,
      });
    }

    next();
  };
};

// Middleware to allow access to both the admin and the user themselves
export const requireAdminOrSelf = (userIdParam = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const resourceUserId = req.params[userIdParam] || req.body.userId;

    if (req.user.role !== "ADMIN" && req.user.id !== resourceUserId) {
      return res.status(403).json({
        error: "Access denied. You must be an admin or the owner of this resource.",
        requiredRole: "ADMIN or self",
        currentRole: req.user.role,
      });
    }
    next();

  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that work differently for authenticated vs unauthenticated users
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return next(); // No token, continue without authentication
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await authRepository.findUserByIdWithSelect(decoded.id, {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isVerified: true,
    });

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // If token verification fails, just continue without authentication
    logger.warn("Optional auth failed:", error.message);
    next();
  }
};

/**
 * Middleware to check if authenticated user matches the resource owner
 * Admins can access any resource
 */
export const requireOwnership = (userIdParam = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const resourceUserId = req.params[userIdParam] || req.body.userId;

    // Admins can access any resource
    if (req.user.role === "ADMIN") {
      return next();
    }

    // Check if user owns the resource
    if (req.user.id !== resourceUserId) {
      return res
        .status(403)
        .json({ error: "You can only access your own resources" });
    }

    next();
  };
};
