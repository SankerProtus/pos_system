import { reportService } from "../services/report.service.js";

export const reportController = {
  getDailyReport: async (req, res) => {
    try {
      const { date } = req.query;
      if (!date || isNaN(Date.parse(date))) {
        return res
          .status(400)
          .json({
            error: "Date query parameter is required and must be a valid date",
          });
      }
      const report = await reportService.getDailyReport(date);
      res.status(200).json(report);
    } catch (error) {
      console.error("Error fetching daily report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getWeeklyReport: async (_req, res) => {
    try {
      const report = await reportService.getWeeklyReport();
      res.status(200).json(report);
    } catch (error) {
      console.error("Error fetching weekly report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getMonthlyReport: async (_req, res) => {
    try {
      const report = await reportService.getMonthlyReport();
      res.status(200).json(report);
    } catch (error) {
      console.error("Error fetching monthly report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  // Added product report endpoint
  getProductReport: async (req, res) => {
    try {
      const { from, to } = req.query;
      if (!from || !to) {
        return res
          .status(400)
          .json({ error: "from and to query parameters are required" });
      }
      const report = await reportService.getProductReport(from, to);
      res.status(200).json(report);
    } catch (error) {
      console.error("Error fetching product report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  // Added cashier report endpoint
  getCashierReport: async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res
          .status(400)
          .json({ error: "date query parameter is required" });
      }
      const report = await reportService.getCashierReport(date);
      res.status(200).json(report);
    } catch (error) {
      console.error("Error fetching cashier report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
