import { prisma } from "../lib/Prisma.js";

export const reportRepository = {
  getDailyReport: async (date) => {
    try {
      // Aggregate sales for the given date
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      // Get all completed sales for the day
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: start,
            lt: end,
          },
          status: "COMPLETED",
        },
        include: {
          saleItems: true,
          payment: true,
        },
      });
      // Total revenue
      const totalRevenue = sales.reduce(
        (sum, sale) => sum + Number(sale.totalAmount || 0),
        0,
      );
      // Total transactions
      const totalTransactions = sales.length;
      // Total items sold
      const totalItemsSold = sales.reduce(
        (sum, sale) => sum + sale.saleItems.reduce((s, i) => s + i.quantity, 0),
        0,
      );
      // Top products
      const productMap = {};
      for (const sale of sales) {
        for (const item of sale.saleItems) {
          if (!productMap[item.productId]) {
            productMap[item.productId] = {
              name: item.productName,
              revenue: 0,
              quantity: 0,
            };
          }
          productMap[item.productId].revenue += Number(item.subtotal || 0);
          productMap[item.productId].quantity += item.quantity;
        }
      }
      const topProducts = Object.values(productMap).sort(
        (a, b) => b.revenue - a.revenue,
      );
      // Payment method breakdown
      const paymentMethodBreakdown = [];
      const paymentMap = {};
      for (const sale of sales) {
        const method = sale.payment?.method || "Unknown";
        if (!paymentMap[method]) paymentMap[method] = 0;
        paymentMap[method] += Number(sale.totalAmount || 0);
      }
      for (const method in paymentMap) {
        paymentMethodBreakdown.push({ method, amount: paymentMap[method] });
      }
      // Low stock count
      const lowStockCount = await prisma.inventory.count({
        where: {
          quantity: { lt: 10 },
        },
      });
      // Hourly sales (8:00–21:00)
      const hourlySales = [];
      for (let hour = 8; hour <= 21; hour++) {
        const hourStart = new Date(start);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        const hourSales = sales.filter(sale => {
          const createdAt = new Date(sale.createdAt);
          return createdAt >= hourStart && createdAt < hourEnd;
        });
        const revenue = hourSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
        hourlySales.push({ hour, revenue });
      }
      return {
        date: start.toISOString().split("T")[0],
        totalRevenue,
        totalTransactions,
        totalItemsSold,
        lowStockCount,
        topProducts,
        paymentMethodBreakdown,
        sales,
        hourlySales,
      };
    } catch (error) {
      console.error("Error fetching daily report:", error);
      throw new Error("Internal server error");
    }
  },

  // New product report repository
  getProductReport: async (from, to) => {
    try {
      const start = new Date(from);
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      // Aggregate sales by product for the date range
      const sales = await prisma.saleItem.findMany({
        where: {
          sale: {
            createdAt: {
              gte: start,
              lt: end,
            },
            status: "COMPLETED",
          },
        },
        include: {
          product: true,
        },
      });
      // Group by product
      const productMap = {};
      for (const item of sales) {
        const pid = item.productId;
        if (!productMap[pid]) {
          productMap[pid] = {
            product: item.product,
            totalSold: 0,
            totalRevenue: 0,
          };
        }
        productMap[pid].totalSold += item.quantity;
        productMap[pid].totalRevenue += Number(item.subtotal || 0);
      }
      return Object.values(productMap);
    } catch (error) {
      console.error("Error fetching product report:", error);
      throw new Error("Internal server error");
    }
  },

  // New cashier report repository
  getCashierReport: async (date) => {
    try {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      // Aggregate sales by cashier for the date
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: start,
            lt: end,
          },
          status: "COMPLETED",
        },
        include: {
          user: true,
        },
      });
      // Group by cashier
      const cashierMap = {};
      for (const sale of sales) {
        const uid = sale.userId;
        if (!cashierMap[uid]) {
          cashierMap[uid] = {
            cashier: sale.user,
            totalSales: 0,
            totalRevenue: 0,
          };
        }
        cashierMap[uid].totalSales += 1;
        cashierMap[uid].totalRevenue += Number(sale.totalAmount || 0);
      }
      return Object.values(cashierMap);
    } catch (error) {
      console.error("Error fetching cashier report:", error);
      throw new Error("Internal server error");
    }
  },
  getWeeklyReport: async () => {
    try {
      // Aggregate sales for the current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      // Get all completed sales for the week
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: startOfWeek,
            lt: endOfWeek,
          },
          status: "COMPLETED",
        },
      });

      // Prepare daily revenue for each day of the week (Sunday to Saturday)
      const days = [];
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(startOfWeek);
        dayStart.setDate(startOfWeek.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        // Calculate revenue for this day
        const daySales = sales.filter((sale) => {
          const createdAt = new Date(sale.createdAt);
          return createdAt >= dayStart && createdAt < dayEnd;
        });
        const revenue = daySales.reduce(
          (sum, sale) => sum + Number(sale.totalAmount || 0),
          0,
        );
        // Label as weekday name (e.g., 'Sun', 'Mon', ...)
        const label = dayStart.toLocaleDateString("en-US", {
          weekday: "short",
        });
        days.push({ label, revenue });
      }

      const totalSales = sales.length;
      const totalAmount = sales.reduce(
        (sum, sale) => sum + Number(sale.totalAmount || 0),
        0,
      );
      return {
        weekStart: startOfWeek.toISOString().split("T")[0],
        weekEnd: endOfWeek.toISOString().split("T")[0],
        totalSales,
        totalAmount,
        days,
        sales,
      };
    } catch (error) {
      console.error("Error fetching weekly report:", error);
      throw new Error("Internal server error");
    }
  },
  getMonthlyReport: async () => {
    try {
      // Aggregate sales for the current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
          status: "COMPLETED",
        },
      });
      const totalSales = sales.length;
      const totalAmount = sales.reduce(
        (sum, sale) => sum + Number(sale.totalAmount || 0),
        0,
      );
      return {
        monthStart: startOfMonth.toISOString().split("T")[0],
        monthEnd: endOfMonth.toISOString().split("T")[0],
        totalSales,
        totalAmount,
        sales,
      };
    } catch (error) {
      console.error("Error fetching monthly report:", error);
      throw new Error("Internal server error");
    }
  },
};
