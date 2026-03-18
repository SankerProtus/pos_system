import { categoriesService } from "../services/categories.service.js";
import { logger } from "../utils/logger.js";

export const categoriesController = {
  getCategories: async (req, res) => {
    try {
      const categories = await categoriesService.getCategories();
      res.status(200).json({ data: categories });
    } catch (error) {
      console.error("Error fetching categories:", error);
      logger.error(`Error fetching categories: ${error.message}`);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  },

  createCategory: async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res
          .status(400)
          .json({
            message:
              "Category name is required and must be at least 2 characters.",
          });
      }
      // Prevent duplicate
      const existing = await categoriesService.findByName(name);
      if (existing) {
        return res
          .status(409)
          .json({ message: "Category name already exists." });
      }
      const category = await categoriesService.createCategory({
        name,
        description,
      });
      res.status(201).json({ data: category });
    } catch (error) {
      logger.error(`Error creating category: ${error.message}`);
      res.status(500).json({ message: "Failed to create category" });
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;
      if (name && (typeof name !== "string" || name.trim().length < 2)) {
        return res
          .status(400)
          .json({ message: "Category name must be at least 2 characters." });
      }
      const updated = await categoriesService.updateCategory(id, {
        name,
        description,
        isActive,
      });
      res.status(200).json({ data: updated });
    } catch (error) {
      logger.error(`Error updating category: ${error.message}`);
      res.status(500).json({ message: "Failed to update category" });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;
      await categoriesService.deleteCategory(id);
      res.status(204).end();
    } catch (error) {
      logger.error(`Error deleting category: ${error.message}`);
      res.status(500).json({ message: "Failed to delete category" });
    }
  },

  getProductsByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const products =
        await categoriesService.getProductsByCategory(categoryId);
      if (products.length === 0) {
        return res
          .status(404)
          .json({ message: "No products found for this category" });
      }
      res.status(200).json({ data: products });
    } catch (error) {
      console.error("Error fetching products by category:", error);
      logger.error(`Error fetching products by category: ${error.message}`);
      res.status(500).json({ message: "Failed to fetch products by category" });
    }
  },
};
