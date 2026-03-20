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
      // Calculate tax
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
      // Calculate totalAmount
      const totalAmount = Math.round((subtotal + tax - discount) * 100) / 100;
      // Prepare sale payload
      // Ensure userId is present
      const userId = saleData.userId;
      if (!userId) throw new Error("User ID required for sale");
      const salePayload = {
        ...saleData,
        subtotal,
        totalAmount,
        user: { connect: { id: userId } },
        items: saleData.items.map((item) => ({
          productId: item.productId,
          price: Number(item.price),
          quantity: item.quantity,
          taxRate: Number(item.taxRate) || 0,
          barcode: item.barcode,
        })),
      };
      const newSale = await salesRepository.createSale(salePayload);
      return newSale;
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
