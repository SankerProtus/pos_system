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
        user: true,
        customer: true,
        saleItems: true,
        payment: true,
        receipt: true,
      },
    });
  },
  createSale: async (saleData) => {
    const saleItems = saleData?.saleItems?.create || [];
    const userId = saleData?.user?.connect?.id || null;
    const customerId = saleData?.customer?.connect?.id || null;

    return await prisma.$transaction(async (tx) => {
      // Validate inventory availability for each sale line before creating sale
      for (const item of saleItems) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory) {
          throw new Error(`Inventory not found for product: ${item.productId}`);
        }

        if (inventory.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${item.productName || item.productId}`,
          );
        }
      }

      const newSale = await tx.sale.create({
        data: saleData,
        include: {
          user: true,
          customer: true,
          saleItems: true,
          payment: true,
        },
      });

      // Apply inventory movements and audit records after sale creation
      for (const item of saleItems) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        const quantityBefore = inventory.quantity;
        const quantityAfter = quantityBefore - item.quantity;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: quantityAfter },
        });

        if (userId) {
          await tx.stockAdjustment.create({
            data: {
              inventoryId: inventory.id,
              productId: item.productId,
              userId,
              reason: "SALE",
              quantityBefore,
              quantityChange: -item.quantity,
              quantityAfter,
              referenceId: newSale.id,
            },
          });
        }
      }

      // Award loyalty points to registered customers.
      if (customerId) {
        const pointsEarned = Math.max(
          0,
          Math.floor(Number(newSale.totalAmount) || 0),
        );
        if (pointsEarned > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              loyaltyPoints: {
                increment: pointsEarned,
              },
            },
          });
        }
      }

      return newSale;
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
  voidSale: async (saleId, actorUserId) => {
    return await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { saleItems: true },
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      if (sale.status === "VOIDED") {
        throw new Error("Sale is already voided");
      }

      for (const item of sale.saleItems) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (!inventory) continue;

        const quantityBefore = inventory.quantity;
        const quantityAfter = quantityBefore + item.quantity;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: quantityAfter },
        });

        const adjustmentUserId = actorUserId || sale.userId || null;
        if (adjustmentUserId) {
          await tx.stockAdjustment.create({
            data: {
              inventoryId: inventory.id,
              productId: item.productId,
              userId: adjustmentUserId,
              reason: "VOID",
              quantityBefore,
              quantityChange: item.quantity,
              quantityAfter,
              referenceId: sale.id,
            },
          });
        }
      }

      // Revert awarded loyalty points when a completed sale is voided.
      if (sale.customerId) {
        const pointsToRevert = Math.max(
          0,
          Math.floor(Number(sale.totalAmount) || 0),
        );
        if (pointsToRevert > 0) {
          const customer = await tx.customer.findUnique({
            where: { id: sale.customerId },
            select: { loyaltyPoints: true },
          });

          if (customer) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: {
                loyaltyPoints: Math.max(
                  0,
                  (customer.loyaltyPoints || 0) - pointsToRevert,
                ),
              },
            });
          }
        }
      }

      return await tx.sale.update({
        where: { id: saleId },
        data: { status: "VOIDED" },
      });
    });
  },
  createReceipt: async (receiptData) => {
    return await prisma.receipt.create({
      data: receiptData,
    });
  },
};
