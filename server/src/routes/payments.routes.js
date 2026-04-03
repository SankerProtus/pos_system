import express from "express";
import { paymentsController } from "../controllers/payments.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/initialize", authenticateToken, paymentsController.initialize);
router.post("/submit-otp", authenticateToken, paymentsController.submitOtp);
router.get("/verify/:reference", paymentsController.verify);
router.post("/webhook", paymentsController.webhook);

export { router as paymentsRoutes };
