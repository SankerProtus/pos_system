import express from "express";
import { inventoryController } from "../controllers/inventory.controller.js";

const router = express.Router();

// Get all inventory items
router.get("/", inventoryController.getAllInventory);

// Adjust inventory levels for a product
router.post("/adjust", inventoryController.adjustInventory);

// Get inventory item by ID
router.get("/:id", inventoryController.getInventoryById);

// Create a new inventory item
router.post("/", inventoryController.createInventory);

// Update an inventory item
router.put("/:id", inventoryController.updateInventory);

// Delete an inventory item
router.delete("/:id", inventoryController.deleteInventory);

export { router as inventoryRouter };