import { salesRepository } from "../repositories/sales.repository.js";

export const salesService = {
  getSales: async (data) => {
    try {
      const limit = data?.limit;
      const status = data?.status;
      const sales = await salesRepository.getAllSales({ limit, status });
      // Map paymentMethod from payment relation
      return sales.map((sale) => ({
        ...sale,
        paymentMethod: sale.payment?.method || null,
      }));
    } catch (error) {
      console.error("Error fetching sales:", error);
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
          saleItemsWithNames.reduce((sum, item) => sum + Number(item.subtotal), 0) *
            100,
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
      const totalAmount = Math.round((subtotal + taxAmount - discount) * 100) / 100;
      const normalizedAmountPaid = Math.round((Number(amountPaid) || 0) * 100) / 100;
      if (!Number.isFinite(normalizedAmountPaid) || normalizedAmountPaid <= 0) {
        throw new Error("Valid amount paid is required");
      }
      if (normalizedAmountPaid < totalAmount) {
        throw new Error("Amount paid is less than total");
      }
      const changeDue = Math.round((normalizedAmountPaid - totalAmount) * 100) / 100;

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
            method: paymentMethod,
            amountPaid: normalizedAmountPaid,
            changeDue,
          },
        },
      };
      // Create the sale
      const newSale = await salesRepository.createSale(salePayload);
      console.log("New sale created:", newSale);

      // Generate a unique receipt number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const shortId = newSale.id.slice(-4).toUpperCase();
      const receiptNumber = `RCP-${dateStr}-${shortId}`;

      // Fetch user and customer for receipt fields
      const userName = newSale.user?.name || "";
      const customerName = newSale.customer?.name || null;

      // Store info for receipt
        const storeName = process.env.STORE_NAME || "SwiftPOS Retail";
        const storeAddress = process.env.STORE_ADDRESS || "123 Main Street";
        const storeTaxId = process.env.STORE_TAX_ID || "TAX-123456";

      // Create the receipt using the repository
      const receipt = await salesRepository.createReceipt({
        saleId: newSale.id,
        receiptNumber,
        storeName,
        storeAddress,
        storeTaxId,
        cashierName: userName,
        customerName,
        items: newSale.saleItems.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      });

      // Return the sale with the attached receipt
      return {
        ...newSale,
        receipt,
      };
    } catch (error) {
      console.error("Error creating sale:", error);
        const message = error?.message || error?.cause?.message || "";
        if (
          message.includes("Insufficient stock") ||
          message.includes("Inventory not found")
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
      console.error("Error voiding sale:", error);
      throw new Error("Internal server error", { cause: error });
    }
  },
};
