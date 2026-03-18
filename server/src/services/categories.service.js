import { categoriesRepository } from "../repositories/categories.repository.js";

export const categoriesService = {
  getCategories: async () => {
    return await categoriesRepository.getCategories();
  },
  getProductsByCategory: async (categoryId) => {
    if (!categoryId) {
      throw new Error("Category ID is required");
    }
    return await categoriesRepository.getProductsByCategory(categoryId);
  },
  findByName: async (name) => {
    return await categoriesRepository.findByName(name);
  },
  createCategory: async (data) => {
    return await categoriesRepository.createCategory(data);
  },
  updateCategory: async (id, data) => {
    return await categoriesRepository.updateCategory(id, data);
  },
  deleteCategory: async (id) => {
    return await categoriesRepository.deleteCategory(id);
  },
};
