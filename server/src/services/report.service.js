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

  // New product report service
  getProductReport: async (from, to) => {
    try {
      const report = await reportRepository.getProductReport(from, to);
      return report;
    } catch (error) {
      console.error("Error fetching product report:", error);
      throw new Error("Internal server error");
    }
  },

  // New cashier report service
  getCashierReport: async (date) => {
    try {
      const report = await reportRepository.getCashierReport(date);
      return report;
    } catch (error) {
      console.error("Error fetching cashier report:", error);
      throw new Error("Internal server error");
    }
  },
  getWeeklyReport: async (weekStart) => {
    try {
      const report = await reportRepository.getWeeklyReport(weekStart);
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
  },
};
