import express from "express";
import { reportController } from "../controllers/report.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Basic Reports
router.get("/daily", reportController.getDailyReport);
router.get("/weekly", reportController.getWeeklyReport);

export { router as reportRoutes };
