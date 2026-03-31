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
      // Calculate subtotal
      const subtotal =
        Math.round(
          saleData.items.reduce(
            (sum, item) => sum + Number(item.price) * item.quantity,
            0,
          ) * 100,
        ) / 100;
      // Calculate discount
      const discount =
        Math.round((Number(saleData.discountAmount) || 0) * 100) / 100;
      const tax =
        Math.round(
          saleData.items.reduce(
            (sum, item) =>
              sum +
              (Number(item.price) *
                item.quantity *
                (Number(item.taxRate) || 0)) /
                100,
            0,
          ) * 100,
        ) / 100;
      // Calculate total amount
      const totalAmount = Math.round((subtotal + tax - discount) * 100) / 100;
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
      // Fetch product names for all items
      const { productsService } = await import("./products.service.js");
      const saleItemsWithNames = await Promise.all(
        items.map(async (item) => {
          const product = await productsService.getProductById(item.productId);
          if (!product) throw new Error(`Product not found: ${item.productId}`);
          const unitPrice = Number(item.price);
          const quantity = item.quantity;
          const discount = Number(item.discount) || 0;
          const subtotal =
            Math.round((unitPrice * quantity - discount) * 100) / 100;
          return {
            productId: item.productId,
            productName: product.productName,
            unitPrice,
            quantity,
            discount,
            taxRate: Number(item.taxRate) || 0,
            barcode: item.barcode,
            subtotal,
          };
        }),
      );
      const salePayload = {
        ...rest,
        subtotal,
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
            amountPaid: amountPaid,
          },
        },
      };
      // Create the sale
      const newSale = await salesRepository.createSale(salePayload);
      console.log("New sale created:", newSale);

      // Generate a unique receipt number (e.g., RCP-20240601-ABCD)
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const shortId = newSale.id.slice(-4).toUpperCase();
      const receiptNumber = `RCP-${dateStr}-${shortId}`;

      // Fetch user and customer for receipt fields
      const userName = newSale.user?.name || "";
      const customerName = newSale.customer?.name || null;

      // Store info for receipt (these could be from config/env in a real app)
      const storeName = import.meta.env.VITE_STORE_NAME || "SwiftPOS Retail";
      console.log("Store name for receipt:", storeName);
      const storeAddress = import.meta.env.VITE_STORE_ADDRESS || "123 Main Street, Accra";
      const storeTaxId = import.meta.env.VITE_STORE_TAX_ID || "C0000000000";

      // Create the receipt using the repository
      const receipt = await salesRepository.createReceipt({
        saleId: newSale.id,
        receiptNumber,
        storeName,
        storeAddress,
        storeTaxId,
        cashierName: userName,
        customerName,
      });

      // Return the sale with the attached receipt
      return {
        ...newSale,
        receipt,
      };
    } catch (error) {
      console.error("Error creating sale:", error);
      throw new Error("Internal server error", { cause: error });
    }
  },

  voidSale: async (saleId) => {
    try {
      const voidedSale = await salesRepository.voidSale(saleId);
      return voidedSale;
    } catch (error) {
      console.error("Error voiding sale:", error);
      throw new Error("Internal server error", { cause: error });
    }
  },
};
