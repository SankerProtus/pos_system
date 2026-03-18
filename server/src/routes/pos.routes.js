import express from "express";
import { posController } from "../controllers/pos.controller.js";

const router = express.Router();

// POST /api/pos/checkout
router.post("/checkout", posController.checkout);

export { router as posRouter };