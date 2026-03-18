import { productsRepository } from "../repositories/producst.repository.js";

export const productsService = {
    getAllProducts: async () => {
        return await productsRepository.getAllProducts();
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
        if(!data.name || !data.price || !data.category || !data.description) {
            throw new Error("Name, price, category, and description are required");
        }
        return await productsRepository.updateProduct(id, data);
    },
    deleteProduct: async (id) => {
        if (!id) {
            throw new Error("Product ID is required for deletion");
        }
        return await productsRepository.deleteProduct(id);
    }
};