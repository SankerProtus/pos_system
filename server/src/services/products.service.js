import { productsRepository } from "../repositories/producst.repository.js";

export const productsService = {
  getProductByBarcode: async (barcode) => {
    if (!barcode) {
      throw new Error("Barcode is required");
    }
    return await productsRepository.getProductByBarcode(barcode);
  },
  getAllProducts: async (categoryId) => {
    return await productsRepository.getAllProducts(categoryId);
  },
  getProductById: async (id) => {
    if (!id) {
      throw new Error("Product ID is required");
    }
    return await productsRepository.getProductById(id);
  },
  searchProducts: async (search) => {
    if (!search) {
      throw new Error("Search query is required");
    }
    return await productsRepository.searchProducts(search);
  },
  createProduct: async (data) => {
    return await productsRepository.createProduct(data);
  },
  updateProduct: async (id, data) => {
    if (!id) {
      throw new Error("Product ID is required");
    }
    if (!data.productName || !data.price || !data.categoryId) {
      throw new Error("Product name, price, and category are required");
    }
    return await productsRepository.updateProduct(id, data);
  },
  deleteProduct: async (id) => {
    if (!id) {
      throw new Error("Product ID is required for deletion");
    }
    return await productsRepository.deleteProduct(id);
  },
};
