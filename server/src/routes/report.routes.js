import express from "express";
import { reportController } from "../controllers/report.controller.js";

const router = express.Router();

router.get("/daily", reportController.getDailyReport);
router.get("/weekly", reportController.getWeeklyReport);
router.get("/monthly", reportController.getMonthlyReport);
router.get("/products", reportController.getProductReport);
router.get("/cashiers", reportController.getCashierReport);

export { router as reportRoutes };
