import { salesService } from "./sales.service.js";
import { productsService } from "./products.service.js";

export const posService = {
  checkout: async (items, paymentMethod, customerId, userId) => {
    if (!userId) {
      throw new Error("Unauthorized: userId is required");
    }

    const normalizedItems = (items || []).map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      discount: Number(item.discount || 0),
      barcode: item.barcode || null,
    }));

    const normalizedMethod = String(paymentMethod || "")
      .trim()
      .toUpperCase();

    // Compute canonical payable amount from current server-side pricing/tax.
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of normalizedItems) {
      const product = await productsService.getProductById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const unitPrice = Number(product.price);
      const quantity = Number(item.quantity);
      const lineDiscount = Number(item.discount || 0);

      subtotal += unitPrice * quantity - lineDiscount;
      taxAmount += (unitPrice * quantity * Number(product.taxRate || 0)) / 100;
    }

    const amountPaid = Math.round((subtotal + taxAmount) * 100) / 100;

    return salesService.createSale({
      items: normalizedItems,
      paymentMethod: normalizedMethod,
      amountPaid,
      customerId: customerId || null,
      userId,
    });
  },
};
