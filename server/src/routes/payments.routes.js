import express from "express";
import { paymentsController } from "../controllers/payments.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/initialize", authenticateToken, paymentsController.initialize);
router.get("/verify/:reference", paymentsController.verify);

export { router as paymentsRoutes };
