import { prisma } from "../lib/Prisma.js";


export const usersRepository = {
    findAllUsers: async () => {
        return await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profileImageUrl: true,
                    role: true,
                    pin: true,
                    isActive: true,
                    lastLoginAt: true,
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
                profileImageUrl: true,
                role: true,
                pin: true,
                isActive: true,
                lastLoginAt: true,
            }
        });
    },

    updateUser: async (id, data) => {
        return await prisma.user.update({
            where: { id },
            data
        });
    },

    createUser: async (userData) => {
        return await prisma.user.create({
            data: userData,
            select: {
                id: true,
                name: true,
                email: true,
                profileImageUrl: true,
                role: true,
                pin: true,
                isActive: true,
                lastLoginAt: true,

            }
        });
    },

    deleteUser: async (id) => {
        return await prisma.user.delete({
            where: { id }
        });
    }
};