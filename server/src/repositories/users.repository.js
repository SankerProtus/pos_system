import { prisma } from "../lib/Prisma.js";


export const usersRepository = {
    findAllUsers: async () => {
        return await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    pin: true,
                    isActive: true,
                }
        });
    },

    findUserById: async (id) => {
        return await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                pin: true,
                isActive: true,
            }
        });
    },

    updateUser: async (id, data) => {
        return await prisma.user.update({
            where: { id },
            data
        });
    },

    deleteUser: async (id) => {
        return await prisma.user.delete({
            where: { id }
        });
    }
};