import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Generate access and refresh tokens for a user
 */
export const generateToken = (user, options = {}) => {
  // Generate a unique JWT ID for session tracking
  const jti = crypto.randomUUID();

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    jti,
  };

  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return {
    accessToken,
    refreshToken,
    jti,
  };
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw error;
  }
};

/**
 * Decode a JWT token without verification
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};
