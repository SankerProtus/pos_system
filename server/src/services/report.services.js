import { reportRepository } from "../repositories/report.repository.js";

export const reportService = {
    getDailyReport: async (dateStamp) => {
        try {
            const report = await reportRepository.getDailyReport(dateStamp);
            return report;
        } catch (error) {
            console.error("Error fetching daily report:", error);
            throw new Error("Internal server error");
        }
    },
    getWeeklyReport: async () => {
        try {
            const report = await reportRepository.getWeeklyReport();
            return report;
        } catch (error) {
            console.error("Error fetching weekly report:", error);
            throw new Error("Internal server error");
        }
    },
    getMonthlyReport: async () => {
        try {
            const report = await reportRepository.getMonthlyReport();
            return report;
        } catch (error) {
            console.error("Error fetching monthly report:", error);
            throw new Error("Internal server error");
        }
    }
};