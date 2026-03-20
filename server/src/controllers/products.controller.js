import { productsService } from "../services/products.service.js";
import { logger } from "../utils/logger.js";

export const productsController = {
  getAllProducts: async (req, res) => {
    try {
      const { categoryId } = req.query;
      const products = await productsService.getAllProducts(categoryId);
      res.status(200).json({ data: products });
    } catch (error) {
      console.error("Error fetching products:", error);
      logger.error(`Error fetching products: ${error.message}`);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  },

  getProductById: async (req, res) => {
    try {
      const { id } = req.params;
      const product = await productsService.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(200).json({ data: product });
    } catch (error) {
      console.error("Error fetching product by ID:", error);
      logger.error(`Error fetching product by ID: ${error.message}`);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  },

  searchProducts: async (req, res) => {
    const { search } = req.query;
    console.log("Search query:", search);

    try {
      const products = await productsService.searchProducts(search);
      res.status(200).json({ data: products });
    } catch (error) {
      console.error("Error searching products:", error);
      logger.error(`Error searching products: ${error.message}`);
      res.status(500).json({ message: "Failed to search products" });
    }
  },

  createProduct: async (req, res) => {
    try {
      const productData = req.body;
      const newProduct = await productsService.createProduct(productData);
      res.status(201).json({ data: newProduct });
    } catch (error) {
      console.error("Error creating product:", error);
      logger.error(`Error creating product: ${error.message}`);
      res.status(500).json({ message: "Failed to create product" });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const productData = req.body;
      const updatedProduct = await productsService.updateProduct(
        id,
        productData,
      );
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(200).json({ data: updatedProduct });
    } catch (error) {
      console.error("Error updating product:", error);
      logger.error(`Error updating product: ${error.message}`);
      res.status(500).json({ message: "Failed to update product" });
    }
  },

  getProductByBarcode: async (req, res) => {
    try {
      const { barcode } = req.params;
      const product = await productsService.getProductByBarcode(barcode);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(200).json(product);
    } catch (error) {
      console.error("Error fetching product by barcode:", error);
      logger.error(`Error fetching product by barcode: ${error.message}`);
      res.status(500).json({ message: "Failed to fetch product by barcode" });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedProduct = await productsService.deleteProduct(id);
      if (!deletedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      logger.error(`Error deleting product: ${error.message}`);
      res.status(500).json({ message: "Failed to delete product" });
    }
  },
};
