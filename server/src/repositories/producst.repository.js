import { prisma } from "../lib/Prisma.js";

export const productsRepository = {
  getAllProducts: async () => {
    return await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        productName: true,
        sku: true,
        barcode: true,
        description: true,
        imageUrl: true,
        price: true,
        costPrice: true,
        taxRate: true,
        category: true,
        inventory: {
          select: {
            quantity: true,
            lowStockLevel: true,
            reorderPoint: true,
          },
        },
        saleItems: true,
        stockAdjustments: true,
        supplierProducts: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
  getProductById: async (id) => {
    return await prisma.product.findUnique({ where: { id } });
  },
  searchProducts: async (search) => {
    return await prisma.product.findMany({
      where: {
        OR: [
          { productName: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  },
  createProduct: async (data) => {
    // Extract inventory fields from data
    const {
      initialQuantity = 0,
      lowStockThreshold = 10,
      reorderPoint = 20,
      ...productData
    } = data;

    return await prisma.product.create({
      data: {
        ...productData,
        inventory: {
          create: {
            quantity: Number(initialQuantity),
            lowStockLevel: Number(lowStockThreshold),
            reorderPoint: Number(reorderPoint),
          },
        },
      },
      include: {
        inventory: true,
      },
    });
  },
  updateProduct: async (id, data) => {
    return await prisma.product.update({ where: { id }, data });
  },
  deleteProduct: async (id) => {
    return await prisma.product.delete({ where: { id } });
  },
};
