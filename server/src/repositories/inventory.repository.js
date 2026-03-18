import { prisma } from "../lib/Prisma.js";

export const inventoryRepository = {
  getAll: async () => {
    return await prisma.inventory.findMany({
      select: {
        id: true,
        productId: true,
        quantity: true,
        lowStockLevel: true,
        reorderPoint: true,
        updatedAt: true,
        product: {
          select: {
            sku: true,
            productName: true,
            category: {
              select: { name: true },
            },
            supplierProducts: {
              select: {
                supplier: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });
  },
  getById: async (id) => {
    return await prisma.inventory.findUnique({
      where: { id },
    });
  },
  create: async (data) => {
    return await prisma.inventory.create({ data });
  },
  update: async (id, data) => {
    return await prisma.inventory.update({
      where: { id },
      data,
    });
  },
  delete: async (id) => {
    return await prisma.inventory.delete({
      where: { id },
    });
  },
  getByProductId: async (productId) => {
    return await prisma.inventory.findUnique({
      where: { productId },
    });
  },
};
