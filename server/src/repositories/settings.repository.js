import { prisma } from "../lib/Prisma.js";

export const settingsRepository = {
  // Get the single settings row
  getAll: async () => {
    return await prisma.setting.findFirst();
  },
  // Update the settings row by id
  update: async (id, data) => {
    return await prisma.setting.update({
      where: { id },
      data,
    });
  },
};