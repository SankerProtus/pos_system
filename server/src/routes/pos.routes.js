import express from "express";
import { posController } from "../controllers/pos.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// POST /api/pos/checkout
router.post("/checkout", authenticateToken, posController.checkout);

export { router as posRouter };
