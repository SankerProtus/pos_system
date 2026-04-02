import { prisma } from "../lib/Prisma.js";

export const settingsRepository = {
  // Get the single settings row.
  getOne: async () => {
    return await prisma.setting.findFirst();
  },

  // Ensure there is a single settings row and update it.
  upsertOne: async (data) => {
    const existing = await prisma.setting.findFirst({
      select: { id: true },
    });

    if (!existing) {
      return await prisma.setting.create({
        data: {
          storeName: "SwiftPOS Retail",
          ...data,
        },
      });
    }

    return await prisma.setting.update({
      where: { id: existing.id },
      data,
    });
  },

  // Update the settings row by id.
  update: async (id, data) => {
    return await prisma.setting.update({
      where: { id },
      data,
    });
  },
};
