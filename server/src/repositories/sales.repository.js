import { prisma } from "../lib/Prisma.js";

export const salesRepository = {
  getAllSales: async (data = {}) => {
    const limit = data?.limit;
    const status = data?.status;
    const parseLimit = limit ? parseInt(limit) : undefined;
    return await prisma.sale.findMany({
      where: {
        status: status || undefined,
      },
      take: Number.isInteger(parseLimit) ? parseLimit : undefined,
      include: {
        payment: true,
      },
    });
  },
  createSale: async (saleData) => {
    return await prisma.sale.create({
      data: saleData,
    });
  },
  getSalesByDate: async (date) => {
    return await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: new Date(date),
          lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
  },
  getSalesByWeek: async () => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfWeek,
        },
      },
    });
  },
  getSalesByMonth: async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });
  },
  getSalesByLimit: async (limit) => {
    return await prisma.sale.findMany({
      take: limit ? parseInt(limit) : undefined,
    });
  },
};
