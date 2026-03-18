import { inventoryRepository } from "../repositories/inventory.repository.js";

export const inventoryService = {
    getAllInventory: async () => {
        return await inventoryRepository.getAll();
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
    adjustInventory: async (productId, adjustment) => {
        const inventoryItem = await inventoryRepository.getByProductId(productId);
        if (!inventoryItem) {
            throw new Error("Inventory item not found for the given product ID");
        }
        const newQuantity = inventoryItem.quantity + adjustment;
        if (newQuantity < 0) {
            throw new Error("Inventory adjustment cannot result in negative quantity");
        }
        return await inventoryRepository.update(inventoryItem.id, { quantity: newQuantity });
    }
};