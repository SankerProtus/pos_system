import { usersService } from "../services/users.services.js";
import { logger } from "../utils/logger.js";

export const usersController = {
    getAllUsers: async (req, res) => {
        try {
            const users = await usersService.getAllUsers();
            res.json(users);
        } catch (error) {
            logger.error("Error fetching users:", error.message || error);
            res.status(500).json({ error: "Failed to fetch users" });
        }
    },

    getUserById: async (req, res) => {
        try {
            const userId = req.params.id;
            console.log("Fetching user with ID:", userId);
            const user = await usersService.getUserById(userId);
            res.json(user);
        } catch (error) {
            logger.error("Error fetching user:", error.message || error);
            res.status(500).json({ error: "Failed to fetch user" });
        }
    },

    updateUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const updateData = req.body;
            const updatedUser = await usersService.updateUser(userId, updateData);
            res.json(updatedUser);
        } catch (error) {
            logger.error("Error updating user:", error.message || error);
            res.status(500).json({ error: "Failed to update user" });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const deletedUser = await usersService.deleteUser(userId);
            res.json({ message: "User deleted successfully" });
        } catch (error) {
            logger.error("Error deleting user:", error.message || error);
            res.status(500).json({ error: "Failed to delete user" });
        }
    }

};