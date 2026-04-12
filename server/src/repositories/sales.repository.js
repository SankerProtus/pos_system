import { prisma } from "../lib/Prisma.js";
import { logger } from "../utils/logger.js";

export const salesRepository = {
  getAllSales: async (data = {}) => {
    const limit = data?.limit;
    const status = data?.status;
    const from = data?.from;
    const to = data?.to;
    const parseLimit = limit ? parseInt(limit, 10) : undefined;

    const where = {
      status: status || undefined,
    };

    if (from || to) {
      const createdAt = {};
      const isDateOnly = (value) =>
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

      if (from) {
        const fromDate = new Date(from);
        if (isDateOnly(from)) {
          fromDate.setUTCHours(0, 0, 0, 0);
        }
        createdAt.gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (isDateOnly(to)) {
          // For date-only queries, include the full day by using lt next day at 00:00.
          toDate.setUTCHours(0, 0, 0, 0);
          toDate.setUTCDate(toDate.getUTCDate() + 1);
          createdAt.lt = toDate;
        } else {
          createdAt.lte = toDate;
        }
      }

      where.createdAt = createdAt;
    }

    return await prisma.sale.findMany({
      where,
      take: Number.isInteger(parseLimit) ? parseLimit : undefined,
      orderBy: {
        createdAt: "desc",
      },
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
    const paymentCreate = saleData?.payment?.create;

    logger.info(
      `[salesRepository.createSale] begin itemCount=${saleItems.length} paymentMethod=${saleData?.payment?.create?.method || "UNKNOWN"}`,
    );

    if (!paymentCreate) {
      throw new Error("Payment data is required for atomic sale creation");
    }

    return await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: saleData,
        include: {
          user: true,
          customer: true,
          saleItems: true,
          payment: true,
        },
      });

      logger.info(
        `[salesRepository.createSale] sale row created saleId=${newSale.id} items=${newSale.saleItems.length}`,
      );

      // Apply inventory movements and audit records after sale creation
      for (const item of saleItems) {
        const decrementResult = await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            quantity: { gte: item.quantity },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        if (decrementResult.count === 0) {
          const inventory = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });
          if (!inventory) {
            throw new Error(
              `Inventory not found for product: ${item.productId}`,
            );
          }

          throw new Error(
            `Insufficient stock for product ${item.productName || item.productId}`,
          );
        }

        const inventoryAfter = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        const quantityAfter = inventoryAfter?.quantity ?? 0;
        const quantityBefore = quantityAfter + Number(item.quantity);

        logger.info(
          `[salesRepository.createSale] inventory updated productId=${item.productId} before=${quantityBefore} after=${quantityAfter}`,
        );

        if (userId) {
          await tx.stockAdjustment.create({
            data: {
              inventoryId: inventoryAfter.id,
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

          logger.info(
            `[salesRepository.createSale] loyalty points updated customerId=${customerId} points=${pointsEarned}`,
          );
        }
      }

      const dateStr = newSale.createdAt
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");
      const shortId = newSale.id.slice(-4).toUpperCase();
      const receiptNumber = `RCP-${dateStr}-${shortId}`;
      const storeName = process.env.STORE_NAME || "SwiftPOS Retail";
      const storeAddress = process.env.STORE_ADDRESS || "123 Main Street";
      const storeTaxId = process.env.STORE_TAX_ID || "TAX-123456";

      const receipt = await tx.receipt.create({
        data: {
          saleId: newSale.id,
          receiptNumber,
          storeName,
          storeAddress,
          storeTaxId,
          cashierName: newSale.user?.name || "",
          customerName: newSale.customer?.name || null,
          items: newSale.saleItems.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      });

      logger.info(
        `[salesRepository.createSale] transaction complete saleId=${newSale.id}`,
      );
      return {
        ...newSale,
        receipt,
      };
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
    logger.info(`[salesRepository.voidSale] begin saleId=${saleId}`);
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

        logger.info(
          `[salesRepository.voidSale] inventory restored productId=${item.productId} before=${quantityBefore} after=${quantityAfter}`,
        );

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
