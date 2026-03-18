import { prisma } from "../lib/Prisma.js";

export const categoriesRepository = {
  getCategories: async () => {
    return await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  },
  getProductsByCategory: async (categoryName) => {
    return await prisma.category.findMany({
      where: { name: categoryName },
      orderBy: { createdAt: "desc" },
    });
  },
  findByName: async (name) => {
    return await prisma.category.findUnique({ where: { name } });
  },
  createCategory: async (data) => {
    return await prisma.category.create({ data });
  },
  updateCategory: async (id, data) => {
    return await prisma.category.update({ where: { id }, data });
  },
  deleteCategory: async (id) => {
    return await prisma.category.delete({ where: { id } });
  },
};
