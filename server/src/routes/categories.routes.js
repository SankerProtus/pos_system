import express from "express";
import { categoriesController } from "../controllers/categories.controller.js";

const router = express.Router();

// Get categories

// Get all categories
router.get("/", categoriesController.getCategories);

// Create category
router.post("/", categoriesController.createCategory);

// Update category
router.put("/:id", categoriesController.updateCategory);

// Delete category
router.delete("/:id", categoriesController.deleteCategory);

// Get products by category
router.get("/category/:category", categoriesController.getProductsByCategory);

export { router as categoriesRouter };
