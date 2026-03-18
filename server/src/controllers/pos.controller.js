import { posService } from "../services/pos.service.js";

export const posController = {
  checkout: async (req, res) => {
    try {
      const { items, paymentMethod, customerId } = req.body;
      const sale = await posService.checkout(items, paymentMethod, customerId);
      res.status(201).json(sale);
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "An error occurred during checkout." });
    }
  },
};
