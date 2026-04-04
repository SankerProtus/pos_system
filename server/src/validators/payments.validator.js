import { body, param, validationResult } from "express-validator";

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
    .withMessage("phoneNumber must be a string"),
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
