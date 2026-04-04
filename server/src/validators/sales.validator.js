import { body, validationResult } from "express-validator";

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

export const validateCreateSale = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("items must be a non-empty array"),
  body("items.*.productId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Each item needs a productId"),
  body("items.*.quantity")
    .isInt({ gt: 0 })
    .withMessage("Each item quantity must be an integer greater than 0"),
  body("paymentMethod")
    .exists()
    .withMessage("paymentMethod is required")
    .bail()
    .isIn(["CASH", "CARD", "MOBILE_MONEY"])
    .withMessage("Invalid paymentMethod"),
  body("amountPaid")
    .exists()
    .withMessage("amountPaid is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("amountPaid must be greater than 0"),
  body("reference")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 6, max: 100 })
    .withMessage("reference length is invalid"),
  body("discountAmount")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("discountAmount cannot be negative"),
  failOnValidation,
];
