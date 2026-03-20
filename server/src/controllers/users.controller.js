import { usersService } from "../services/users.service.js";
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

  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await usersService.getUserById(userId);
      res.json(user);
    } catch (error) {
      logger.error("Error fetching user profile:", error.message || error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  },

  updateUser: async (req, res) => {
    try {
      const userId = req.params.id;
      const requester = req.user;
      let updateData = req.body;

      // Only allow certain fields to be updated
      const allowedFields = ["name", "email", "pin", "isActive"];
      // Only admins can update role
      if (requester.role === "ADMIN" && updateData.role) {
        allowedFields.push("role");
      }

      // Sanitize updateData
      updateData = Object.fromEntries(
        Object.entries(updateData).filter(([key]) =>
          allowedFields.includes(key),
        ),
      );

      if (Object.keys(updateData).length === 0) {
        logger.warn(
          `User update attempt with no valid fields by ${requester.id}`,
        );
        return res.status(400).json({ error: "No valid fields to update." });
      }

      // Log update attempt
      logger.info(
        `User ${requester.id} updating user ${userId}: ${JSON.stringify(updateData)}`,
      );

      const updatedUser = await usersService.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      logger.error("Error updating user:", error.message || error);
      res.status(500).json({ error: "Failed to update user" });
    }
  },

  createUser: async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.default.hash(password, 10);
      const newUser = await usersService.createUser({ ...userData, passwordHash });
      res.status(201).json(newUser);
    } catch (error) {
      logger.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
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
  },
};
