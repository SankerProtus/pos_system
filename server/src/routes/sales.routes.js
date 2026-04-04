import express from "express";
import { salesController } from "../controllers/sales.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { validateCreateSale } from "../validators/sales.validator.js";

const router = express.Router();

router.get("/", authenticateToken, salesController.getSales);
router.post(
  "/",
  authenticateToken,
  validateCreateSale,
  salesController.createSale,
);
router.post("/:id/void", authenticateToken, salesController.voidSale);

export { router as salesRoutes };
