import express from 'express';
import { reportController } from "../controllers/report.controller.js";

const router = express.Router();

router.get("/reports/daily", reportController.getDailyReport);
router.get("/reports/weekly", reportController.getWeeklyReport);
router.get("/reports/monthly", reportController.getMonthlyReport);

export { router as reportRoutes };