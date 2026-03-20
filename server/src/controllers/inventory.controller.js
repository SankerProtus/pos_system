import { inventoryService } from "../services/inventory.service.js";

export const inventoryController = {
  getAllInventory: async (req, res) => {
    try {
      const inventory = await inventoryService.getAllInventory();
      res.status(200).json({ data: inventory });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  getInventoryById: async (req, res) => {
    try {
      const { id } = req.params;
      const inventoryItem = await inventoryService.getInventoryById(id);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.status(200).json({ data: inventoryItem });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  createInventory: async (req, res) => {
    try {
      const data = req.body;
      const newInventoryItem = await inventoryService.createInventory(data);
      res.status(201).json({ data: newInventoryItem });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  updateInventory: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const updatedInventoryItem = await inventoryService.updateInventory(
        id,
        data,
      );
      if (!updatedInventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.status(200).json({ data: updatedInventoryItem });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  deleteInventory: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedInventoryItem = await inventoryService.deleteInventory(id);
      if (!deletedInventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.status(200).json({ message: "Inventory item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  adjustInventory: async (req, res) => {
    try {
      const { productId, quantityChange, userId, reason, notes, reference } =
        req.body;
      // Map quantityChange to adjustment for compatibility
      const adjustment =
        typeof quantityChange === "number"
          ? quantityChange
          : req.body.adjustment;
      // Input validation
      if (!productId || typeof adjustment !== "number") {
        console.error("Invalid input:", req.body);
        return res
          .status(400)
          .json({ message: "productId and numeric adjustment are required" });
      }
      // Log input
      console.log(
        `Adjusting inventory: productId=${productId}, adjustment=${adjustment}, userId=${userId}, reason=${reason}`,
      );
      try {
        const adjustedInventory = await inventoryService.adjustInventory(
          productId,
          adjustment,
        );
        // Record adjustment in StockAdjustment
        if (userId && reason) {
          const before = adjustedInventory.quantity - adjustment;
          await inventoryService.recordStockAdjustment({
            inventoryId: adjustedInventory.id,
            productId,
            userId,
            reason,
            quantityBefore: before,
            quantityChange: adjustment,
            quantityAfter: adjustedInventory.quantity,
            notes,
          });
        }
        res.status(200).json({ data: adjustedInventory });
      } catch (error) {
        if (error.message.includes("not found")) {
          console.error("Error adjusting inventory:", error);
          return res.status(404).json({ message: "Inventory item not found" });
        }
        if (error.message.includes("negative quantity")) {
          console.error("Error adjusting inventory:", error);
          return res
            .status(422)
            .json({ message: "Inventory quantity cannot be negative" });
        }
        console.error("Inventory adjustment failed:", error);
        res.status(500).json({
          message: "Failed to adjust inventory",
          error: error.message,
        });
      }
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      res
        .status(500)
        .json({ message: "Failed to adjust inventory", error: error.message });
    }
  },
};
