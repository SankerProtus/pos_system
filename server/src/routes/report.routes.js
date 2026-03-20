import express from "express";
import { reportController } from "../controllers/report.controller.js";

const router = express.Router();

router.get("/reports/daily", reportController.getDailyReport);
router.get("/reports/weekly", reportController.getWeeklyReport);
router.get("/reports/monthly", reportController.getMonthlyReport);
router.get("/reports/products", reportController.getProductReport);
router.get("/reports/cashiers", reportController.getCashierReport);

export { router as reportRoutes };
