import { Prisma } from "../lib/Prisma.js";

export const reportRepository = {
    getDailyReport: async (date) => {
        try {
            const report = await Prisma.$queryRaw`SELECT * FROM daily_reports WHERE date = ${date}`;
            return report;
        } catch (error) {
            console.error("Error fetching daily report:", error);
            throw new Error("Internal server error");
        }
    },
    getWeeklyReport: async () => {
        try {
            const report = await Prisma.$queryRaw`SELECT * FROM weekly_reports`;
            return report;
        } catch (error) {
            console.error("Error fetching weekly report:", error);
            throw new Error("Internal server error");
        }
    },
    getMonthlyReport: async () => {
        try {
            const report = await Prisma.$queryRaw`SELECT * FROM monthly_reports`;
            return report;
        } catch (error) {
            console.error("Error fetching monthly report:", error);
            throw new Error("Internal server error");
        }
    }

};