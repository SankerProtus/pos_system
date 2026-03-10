import { body, validationResult } from "express-validator";

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const validateUserRegistration = [
    body("email")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),
    body("name")
    .notEmpty()
    .withMessage("User name is required")
    .trim()
    .escape(),
    body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .trim(),
    handleValidationErrors
]

export const validateUserLogin = [
    body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
    body("password")
    .notEmpty()
    .withMessage("Password is required")
    .trim(),
    handleValidationErrors
]