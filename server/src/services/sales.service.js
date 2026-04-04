import { salesRepository } from "../repositories/sales.repository.js";
import { prisma } from "../lib/Prisma.js";
import { logger } from "../utils/logger.js";

export const salesService = {
  getSales: async (data) => {
    try {
      const limit = data?.limit;
      const status = data?.status;
      const from = data?.from;
      const to = data?.to;
      const sales = await salesRepository.getAllSales({
        limit,
        status,
        from,
        to,
      });
      // Map paymentMethod from payment relation
      return sales.map((sale) => ({
        ...sale,
        paymentMethod: sale.payment?.method || null,
      }));
    } catch (error) {
      logger.error(`Error fetching sales: ${error?.message || error}`);
      throw new Error("Internal server error", { cause: error });
    }
  },
  createSale: async (saleData) => {
    try {
      // Validate input
      if (!Array.isArray(saleData.items) || saleData.items.length === 0)
        throw new Error("No items provided");
      if (!saleData.paymentMethod) throw new Error("Payment method required");
      // Ensure userId is present
      const {
        items,
        paymentMethod,
        amountPaid,
        reference,
        userId,
        customerId,
        discountId,
        ...rest
      } = saleData;
      if (!userId) throw new Error("User ID required for sale");

      // Fetch canonical product data for all items (authoritative pricing/tax)
      const { productsService } = await import("./products.service.js");
      const saleItemsWithNames = await Promise.all(
        items.map(async (item) => {
          const quantity = Number(item.quantity);
          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new Error(`Invalid quantity for product: ${item.productId}`);
          }
          const product = await productsService.getProductById(item.productId);
          if (!product) throw new Error(`Product not found: ${item.productId}`);
          const unitPrice = Number(product.price);
          const discount = Number(item.discount) || 0;
          const subtotal =
            Math.round((unitPrice * quantity - discount) * 100) / 100;
          return {
            productId: item.productId,
            productName: product.productName,
            unitPrice,
            quantity,
            discount,
            taxRate: Number(product.taxRate) || 0,
            barcode: item.barcode,
            subtotal,
          };
        }),
      );

      // Calculate totals from server-side canonical values
      const subtotal =
        Math.round(
          saleItemsWithNames.reduce(
            (sum, item) => sum + Number(item.subtotal),
            0,
          ) * 100,
        ) / 100;
      const discount =
        Math.round((Number(saleData.discountAmount) || 0) * 100) / 100;
      const taxAmount =
        Math.round(
          saleItemsWithNames.reduce(
            (sum, item) =>
              sum +
              (Number(item.unitPrice) * item.quantity * Number(item.taxRate)) /
                100,
            0,
          ) * 100,
        ) / 100;
      const totalAmount =
        Math.round((subtotal + taxAmount - discount) * 100) / 100;

      // Payment validation
      const allowedPaymentMethods = ["CASH", "CARD", "MOBILE_MONEY"];
      const normalizedPaymentMethod = String(paymentMethod || "")
        .trim()
        .toUpperCase();

      if (!allowedPaymentMethods.includes(normalizedPaymentMethod)) {
        throw new Error(
          `Invalid payment method. Allowed methods: ${allowedPaymentMethods.join(", ")}`,
        );
      }

      const normalizedAmountPaid =
        Math.round((Number(amountPaid) || 0) * 100) / 100;

      if (!Number.isFinite(normalizedAmountPaid) || normalizedAmountPaid <= 0) {
        throw new Error("Valid amount paid is required");
      }

      const normalizedReference =
        typeof reference === "string" && reference.trim() !== ""
          ? String(reference).trim()
          : null;
      const paymentReference =
        normalizedReference ||
        `CASH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const toCents = (amount) => Math.round(Number(amount) * 100);
      const totalAmountCents = toCents(totalAmount);
      const amountPaidCents = toCents(normalizedAmountPaid);

      let changeDue = 0;

      if (normalizedPaymentMethod === "CASH") {
        if (amountPaidCents < totalAmountCents) {
          throw new Error("Insufficient amount paid");
        }
        changeDue = (amountPaidCents - totalAmountCents) / 100;
      }

      if (normalizedPaymentMethod === "MOBILE_MONEY") {
        if (!normalizedReference) {
          throw new Error("Mobile money transaction reference is required");
        }

        if (amountPaidCents !== totalAmountCents) {
          throw new Error(
            "Amount paid must match total amount for mobile money payments",
          );
        }

        changeDue = 0;
      }

      if (normalizedPaymentMethod === "CARD") {
        if (!normalizedReference) {
          throw new Error(
            "Card transaction reference is required for Paystack verification",
          );
        }

        if (amountPaidCents !== totalAmountCents) {
          throw new Error(
            "Amount paid must match total amount for card payments",
          );
        }

        changeDue = 0;
      }

      const requiresGatewayVerification =
        normalizedPaymentMethod === "CARD" ||
        normalizedPaymentMethod === "MOBILE_MONEY";
      if (requiresGatewayVerification) {
        if (!normalizedReference) {
          throw new Error(
            "Payment reference is required for card or mobile money verification",
          );
        }

        const existingPayment = await prisma.payment.findUnique({
          where: { reference: normalizedReference },
          include: {
            sale: {
              include: {
                user: true,
                customer: true,
                saleItems: true,
                payment: true,
                receipt: true,
              },
            },
          },
        });

        if (existingPayment?.sale?.status === "COMPLETED") {
          return existingPayment.sale;
        }

        if (existingPayment) {
          throw new Error("Payment reference has already been used");
        }

        const { paystackService } = await import("./paystack.service.js");
        const verified =
          await paystackService.verifyTransaction(normalizedReference);

        const gatewayAmountCents = Math.round(Number(verified?.amount) || 0);
        const expectedAmountCents = totalAmountCents;
        const gatewayStatus = verified?.status;

        if (gatewayStatus !== "success") {
          throw new Error("Payment not successful on Paystack");
        }

        if (
          !Number.isFinite(gatewayAmountCents) ||
          gatewayAmountCents !== expectedAmountCents
        ) {
          throw new Error("Verified payment amount does not match sale total");
        }

        const channel = String(verified?.channel || "").toLowerCase();
        if (normalizedPaymentMethod === "CARD" && channel !== "card") {
          throw new Error("Payment method does not match Paystack channel");
        }
      }

      const salePayload = {
        ...rest,
        status: "COMPLETED",
        subtotal,
        discountAmount: discount,
        taxAmount,
        totalAmount,
        user: { connect: { id: userId } },
        ...(customerId && { customer: { connect: { id: customerId } } }),
        ...(discountId && { discount: { connect: { id: discountId } } }),
        saleItems: {
          create: saleItemsWithNames,
        },
        payment: {
          create: {
            method: normalizedPaymentMethod,
            amountPaid: normalizedAmountPaid,
            changeDue: Math.round(changeDue * 100) / 100,
            reference: paymentReference,
            amount: totalAmount,
          },
        },
      };
      // Create sale + payment + inventory + receipt atomically in one DB transaction.
      const newSale = await salesRepository.createSale(salePayload);
      logger.info(`New sale created: ${newSale.id}`);

      return {
        ...newSale,
      };
    } catch (error) {
      logger.error(`Error creating sale: ${error?.message || error}`);
      const message = error?.message || error?.cause?.message || "";
      if (
        message.includes("Insufficient stock") ||
        message.includes("Inventory not found") ||
        message.includes("No items provided") ||
        message.includes("Payment method required") ||
        message.includes("Invalid payment method") ||
        message.includes("Valid amount paid is required") ||
        message.includes("Amount paid is less than total") ||
        message.includes("Card transaction reference is required") ||
        message.includes("Mobile money transaction reference is required") ||
        message.includes(
          "Amount paid must match total amount for mobile money payments",
        ) ||
        message.includes(
          "Amount paid must match total amount for card payments",
        ) ||
        message.includes("Payment reference has already been used") ||
        message.includes("Payment not successful on Paystack") ||
        message.includes("Verified payment amount does not match sale total") ||
        message.includes("Paystack")
      ) {
        throw new Error(message);
      }
      throw new Error("Internal server error", { cause: error });
    }
  },

  voidSale: async (saleId, userId) => {
    try {
      const voidedSale = await salesRepository.voidSale(saleId, userId);
      return voidedSale;
    } catch (error) {
      logger.error(`Error voiding sale: ${error?.message || error}`);
      throw new Error("Internal server error", { cause: error });
    }
  },
};
