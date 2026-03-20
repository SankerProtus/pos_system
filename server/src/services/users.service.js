import { usersRepository } from "../repositories/users.repository.js";

export const usersService = {
    getAllUsers: async () => {
        return await usersRepository.findAllUsers();
    },

    getUserById: async (id) => {
        const user = await usersRepository.findUserById(id);

        if (!user) throw new Error("User not found.");

        return user;
    },

    updateUser: async (id, updateData) => {
        const updateUser = await usersRepository.findUserById(id);

        if (!updateUser) throw new Error("User not found.");

        return await usersRepository.updateUser(id, updateData);
    },

    updatePassword: async (id, newPassword) => {
        const updateUser = await usersRepository.findUserById(id);

        if (!updateUser) throw new Error("User not found.");

        return await usersRepository.updatePassword(id, { password: newPassword });
    },

    createUser: async (userData) => {
        return await usersRepository.createUser(userData);
    },

    deleteUser: async (id) => {
        const deleteUser = await usersRepository.findUserById(id);

        if (!deleteUser) throw new Error("User not found.");

        return await usersRepository.deleteUser(id);
    }
};