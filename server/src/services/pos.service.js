import { posRepository } from "../repositories/pos.repository.js";

export const posService = {
  checkout: async (items, paymentMethod, customerId) => {
    // Calculate total amount
    const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);
    // Create sale record
    const saleData = {
      totalAmount,
      paymentMethod,
      userId: customerId,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    };
    const sale = await posRepository.createSale(saleData);
    return sale;
  }
};
