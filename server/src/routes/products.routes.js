import express from "express";
import { productsController } from "../controllers/products.controller.js";

const router = express.Router();

// Barcode lookup
router.get("/barcode/:barcode", productsController.getProductByBarcode);

// Get all products
router.get("/", productsController.getAllProducts);

// Get a product by ID
router.get("/:id", productsController.getProductById);

// Search products by name or SKU
router.get("/search", productsController.searchProducts);

// Create a new product
router.post("/", productsController.createProduct);

// Update a product
router.put("/:id", productsController.updateProduct);

// Delete a product
router.delete("/:id", productsController.deleteProduct);

export { router as productsRouter };
