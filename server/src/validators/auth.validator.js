import { body, validationResult } from "express-validator";

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

/**
 * Validate user registration
 */
export const validateUserRegistration = [
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .trim(),
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim()
    .escape(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .trim(),
  handleValidationErrors,
];

/**
 * Validate user login
 */
export const validateUserLogin = [
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .trim(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .trim(),
  handleValidationErrors,
];

/**
 * Validate email verification
 */
export const validateEmailVerification = [
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .trim(),
  body("code")
    .notEmpty()
    .withMessage("Verification code is required")
    .isLength({ min: 4, max: 4 })
    .withMessage("Verification code must be 4 digits")
    .isNumeric()
    .withMessage("Verification code must be numeric")
    .trim(),
  handleValidationErrors,
];

/**
 * Validate resend verification
 */
export const validateResendVerification = [
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .trim(),
  handleValidationErrors,
];

/**
 * Validate password reset request
 */
export const validatePasswordResetRequest = [
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .trim(),
  handleValidationErrors,
];

/**
 * Validate password reset
 */
export const validatePasswordReset = [
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .trim(),
  body("code")
    .notEmpty()
    .withMessage("Reset code is required")
    .isLength({ min: 4, max: 4 })
    .withMessage("Reset code must be 4 digits")
    .isNumeric()
    .withMessage("Reset code must be numeric")
    .trim(),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .trim(),
  handleValidationErrors,
];

/**
 * Validate refresh token
 */
export const validateRefreshToken = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required")
    .trim(),
  handleValidationErrors,
];

/**
 * Validate logout
 */
export const validateLogout = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required")
    .trim(),
  handleValidationErrors,
];
