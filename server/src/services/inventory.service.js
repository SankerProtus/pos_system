import { inventoryRepository } from "../repositories/inventory.repository.js";

export const inventoryService = {
  getAllInventory: async () => {
    const inventory = await inventoryRepository.getAll();
    return inventory.map(item => ({
      ...item,
      lastRestockedAt: item.stockAdjustments && item.stockAdjustments[0]
        ? item.stockAdjustments[0].createdAt
        : null,
    }));
  },
  getInventoryById: async (id) => {
    return await inventoryRepository.getById(id);
  },
  createInventory: async (data) => {
    return await inventoryRepository.create(data);
  },
  updateInventory: async (id, data) => {
    return await inventoryRepository.update(id, data);
  },
  deleteInventory: async (id) => {
    return await inventoryRepository.delete(id);
  },
  adjustInventory: async (
    productId,
    adjustment,
    userId,
    reason,
    notes,
    reference,
  ) => {
    // Validate input
    if (!productId || typeof adjustment !== "number") {
      throw new Error("productId and numeric adjustment are required");
    }
    const inventoryItem = await inventoryRepository.getByProductId(productId);
    if (!inventoryItem) {
      throw new Error("Inventory item not found for the given product ID");
    }
    const quantityBefore = inventoryItem.quantity;
    const newQuantity = quantityBefore + adjustment;
    if (newQuantity < 0) {
      throw new Error(
        "Inventory adjustment cannot result in negative quantity",
      );
    }
    // Update inventory
    const updatedInventory = await inventoryRepository.update(
      inventoryItem.id,
      { quantity: newQuantity },
    );
    // Record adjustment in StockAdjustment for audit
    if (userId && reason) {
      const { prisma } = await import("../lib/Prisma.js");
      await prisma.stockAdjustment.create({
        data: {
          inventoryId: inventoryItem.id,
          productId,
          userId,
          reason,
          quantityBefore,
          quantityChange: adjustment,
          quantityAfter: newQuantity,
          notes,
          referenceId: reference || null,
        },
      });
    }
    // Return full adjustment details
    return {
      inventory: updatedInventory,
      adjustment: {
        productId,
        userId,
        reason,
        quantityBefore,
        quantityChange: adjustment,
        quantityAfter: newQuantity,
        notes,
        reference,
      },
    };
  },
};
