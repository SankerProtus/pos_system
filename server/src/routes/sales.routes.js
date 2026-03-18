import express from 'express';
import { salesController } from "../controllers/sales.controller.js";

const router = express.Router();

router.get("/", salesController.getSales);
router.post("/", salesController.createSale);
router.post("/:id/void", salesController.voidSale);

export { router as salesRoutes };