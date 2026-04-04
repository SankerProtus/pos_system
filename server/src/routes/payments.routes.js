import express from "express";
import { paymentsController } from "../controllers/payments.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  paymentInitializeRateLimiter,
  paymentOtpRateLimiter,
  paymentVerifyRateLimiter,
} from "../utils/rateLimiter.js";
import {
  validatePaymentInitialize,
  validatePaymentSubmitOtp,
  validatePaymentVerify,
} from "../validators/payments.validator.js";

const router = express.Router();

router.post(
  "/initialize",
  authenticateToken,
  paymentInitializeRateLimiter,
  validatePaymentInitialize,
  paymentsController.initialize,
);
router.post(
  "/submit-otp",
  authenticateToken,
  paymentOtpRateLimiter,
  validatePaymentSubmitOtp,
  paymentsController.submitOtp,
);
router.get(
  "/verify/:reference",
  authenticateToken,
  paymentVerifyRateLimiter,
  validatePaymentVerify,
  paymentsController.verify,
);
router.post("/webhook", paymentsController.webhook);

export { router as paymentsRoutes };
