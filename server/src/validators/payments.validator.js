import {
  body,
  header,
  param,
  query,
  validationResult,
} from "express-validator";

const failOnValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

export const validatePaymentInitialize = [
  header("Idempotency-Key")
    .exists()
    .withMessage("Idempotency-Key header is required")
    .bail()
    .isString()
    .withMessage("Idempotency-Key must be a string")
    .bail()
    .trim()
    .isLength({ min: 8, max: 120 })
    .withMessage("Idempotency-Key length must be between 8 and 120 characters"),
  body("amount")
    .exists()
    .withMessage("amount is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0"),
  body("paymentMethod")
    .exists()
    .withMessage("paymentMethod is required")
    .bail()
    .isIn(["CARD", "MOBILE_MONEY", "card", "mobile_money"])
    .withMessage("paymentMethod must be CARD or MOBILE_MONEY"),
  body("customerEmail")
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage("customerEmail must be a valid email"),
  body("phoneNumber")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("phoneNumber must be a string")
    .bail()
    .custom((value) => {
      const normalized = String(value || "")
        .trim()
        .replace(/[\s()-]/g, "");
      return /^(?:\+233\d{9}|0\d{9})$/.test(normalized);
    })
    .withMessage(
      "phoneNumber must be +233XXXXXXXXX or 0XXXXXXXXX (e.g. 0540000000)",
    ),
  failOnValidation,
];

export const validatePaymentSubmitOtp = [
  body("reference")
    .exists()
    .withMessage("reference is required")
    .bail()
    .isString()
    .withMessage("reference must be a string")
    .bail()
    .trim()
    .isLength({ min: 6, max: 100 })
    .withMessage("reference length is invalid"),
  body("otp")
    .exists()
    .withMessage("otp is required")
    .bail()
    .isString()
    .withMessage("otp must be a string")
    .bail()
    .trim()
    .isLength({ min: 3, max: 12 })
    .withMessage("otp length is invalid"),
  failOnValidation,
];

export const validatePaymentCancel = [
  header("Idempotency-Key")
    .exists()
    .withMessage("Idempotency-Key header is required")
    .bail()
    .isString()
    .withMessage("Idempotency-Key must be a string")
    .bail()
    .trim()
    .isLength({ min: 8, max: 120 })
    .withMessage("Idempotency-Key length must be between 8 and 120 characters"),
  body("reference")
    .exists()
    .withMessage("reference is required")
    .bail()
    .isString()
    .withMessage("reference must be a string")
    .bail()
    .trim()
    .isLength({ min: 6, max: 100 })
    .withMessage("reference length is invalid"),
  body("reason")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("reason must be a string")
    .bail()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("reason length must be between 3 and 200 characters"),
  failOnValidation,
];

export const validatePaymentVerify = [
  param("reference")
    .exists()
    .withMessage("reference is required")
    .bail()
    .isString()
    .withMessage("reference must be a string")
    .bail()
    .trim()
    .isLength({ min: 6, max: 100 })
    .withMessage("reference length is invalid"),
  failOnValidation,
];

export const validatePaymentReconciliation = [
  query("from")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("from must be a valid ISO 8601 date"),
  query("to")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("to must be a valid ISO 8601 date"),
  query("page")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("page must be an integer greater than or equal to 1"),
  query("pageSize")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage("pageSize must be an integer between 1 and 100"),
  query("status")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(["PENDING", "SUCCESS", "FAILED", "pending", "success", "failed"])
    .withMessage("status must be PENDING, SUCCESS, or FAILED"),
  query("providerStatus")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("providerStatus must be a string")
    .bail()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("providerStatus length must be between 2 and 50 characters"),
  failOnValidation,
];
