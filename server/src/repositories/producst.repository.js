import { prisma } from "../lib/Prisma.js";

export const productsRepository = {
  getProductByBarcode: async (barcode) => {
    return await prisma.product.findFirst({
      where: {
        isActive: true,
        barcode: {
          equals: barcode,
          mode: "insensitive",
        },
      },
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
  getAllProducts: async ({ categoryId, search, page, limit } = {}) => {
    const where = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { productName: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const select = {
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
    };

    const normalizedPage = Number(page) > 0 ? Number(page) : null;
    const normalizedLimit = Number(limit) > 0 ? Number(limit) : null;

    if (normalizedPage && normalizedLimit) {
      const [items, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (normalizedPage - 1) * normalizedLimit,
          take: normalizedLimit,
          select,
        }),
        prisma.product.count({ where }),
      ]);

      return {
        items,
        total,
        page: normalizedPage,
        limit: normalizedLimit,
        totalPages: Math.max(Math.ceil(total / normalizedLimit), 1),
      };
    }

    const items = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select,
    });

    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length || 0,
      totalPages: 1,
    };
  },
  getProductById: async (id) => {
    return await prisma.product.findUnique({ where: { id } });
  },
  searchProducts: async (search) => {
    return await prisma.product.findMany({
      where: {
        isActive: true,
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
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            saleItems: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return null;
    }

    if (existingProduct._count.saleItems > 0) {
      const archivedProduct = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        action: "archived",
        product: archivedProduct,
      };
    }

    const deletedProduct = await prisma.$transaction(async (tx) => {
      await tx.stockAdjustment.deleteMany({ where: { productId: id } });
      await tx.supplierProduct.deleteMany({ where: { productId: id } });

      return await tx.product.delete({ where: { id } });
    });

    return {
      action: "deleted",
      product: deletedProduct,
    };
  },
};
