import { reportService } from "../services/report.services.js";

export const reportController = {
    getDailyReport: async (req, res) => {
        try {
            const { date } = req.query;
            if (!date || isNaN(Date.parse(date))) {
                return res.status(400).json({ error: "Date query parameter is required and must be a valid date" });
            }
            const report = await reportService.getDailyReport(date);
            res.status(200).json(report);
        } catch (error) {
            console.error("Error fetching daily report:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    getWeeklyReport: async (req, res) => {
        try {
            const report = await reportService.getWeeklyReport();
            res.status(200).json(report);
        } catch (error) {
            console.error("Error fetching weekly report:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    getMonthlyReport: async (req, res) => {
        try {
            const report = await reportService.getMonthlyReport();
            res.status(200).json(report);
        } catch (error) {
            console.error("Error fetching monthly report:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
};