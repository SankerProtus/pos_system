import express from "express";
import { paymentsController } from "../controllers/payments.controller.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/auth.middleware.js";
import {
  idempotencyMiddleware,
  requireIdempotencyKey,
} from "../middlewares/idempotency.middleware.js";
import {
  paymentCancelRateLimiter,
  paymentInitializeRateLimiter,
  paymentOtpRateLimiter,
  paymentVerifyRateLimiter,
} from "../utils/rateLimiter.js";
import {
  validatePaymentCancel,
  validatePaymentInitialize,
  validatePaymentReconciliation,
  validatePaymentSubmitOtp,
  validatePaymentVerify,
} from "../validators/payments.validator.js";

const router = express.Router();

router.post(
  "/initialize",
  authenticateToken,
  paymentInitializeRateLimiter,
  requireIdempotencyKey,
  idempotencyMiddleware("POST:/payments/initialize"),
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
router.post(
  "/cancel",
  authenticateToken,
  paymentCancelRateLimiter,
  requireIdempotencyKey,
  idempotencyMiddleware("POST:/payments/cancel"),
  validatePaymentCancel,
  paymentsController.cancel,
);
router.get(
  "/verify/:reference",
  authenticateToken,
  paymentVerifyRateLimiter,
  validatePaymentVerify,
  paymentsController.verify,
);
router.get(
  "/reconciliation",
  authenticateToken,
  requireRole("ADMIN", "MANAGER"),
  validatePaymentReconciliation,
  paymentsController.reconciliation,
);
router.post("/webhook", paymentsController.webhook);

export { router as paymentsRoutes };
