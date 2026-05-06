import { usersService } from "../services/users.service.js";
import { logger } from "../utils/logger.js";
import fs from "fs/promises";
import path from "path";

const PROFILE_IMAGE_PATH_PREFIX = "/uploads/profile-images/";

const resolveLocalProfileImagePath = (profileImageUrl) => {
  if (!profileImageUrl) {
    return null;
  }

  let imagePathname = profileImageUrl;

  try {
    imagePathname = new URL(profileImageUrl).pathname;
  } catch {
    imagePathname = profileImageUrl;
  }

  if (!imagePathname.startsWith(PROFILE_IMAGE_PATH_PREFIX)) {
    return null;
  }

  const fileName = path.basename(imagePathname);
  return path.resolve(process.cwd(), "uploads", "profile-images", fileName);
};

export const usersController = {
  getAllUsers: async (req, res) => {
    try {
      const users = await usersService.getAllUsers();
      res.json(users);
    } catch (error) {
      logger.error(`Error fetching users: ${error.message || error}`);
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
      logger.error(`Error fetching user: ${error.message || error}`);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },

  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await usersService.getUserById(userId);
      res.json(user);
    } catch (error) {
      logger.error(`Error fetching user profile: ${error.message || error}`);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  },

  updateUser: async (req, res) => {
    try {
      const userId = req.params.id;
      const requester = req.user;
      let updateData = req.body;

      // Only allow certain fields to be updated
      const allowedFields = [
        "name",
        "email",
        "pin",
        "isActive",
        "profileImageUrl",
      ];
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
      logger.error(`Error updating user: ${error.message || error}`);
      res.status(500).json({ error: "Failed to update user" });
    }
  },

  uploadProfileImage: async (req, res) => {
    try {
      const userId = req.params.id;

      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Profile image file is required." });
      }

      const existingUser = await usersService.getUserById(userId);
      const profileImageUrl = `${req.protocol}://${req.get("host")}${PROFILE_IMAGE_PATH_PREFIX}${req.file.filename}`;

      const updatedUser = await usersService.updateUser(userId, {
        profileImageUrl,
      });

      const existingImagePath = resolveLocalProfileImagePath(
        existingUser?.profileImageUrl,
      );
      const updatedImagePath = resolveLocalProfileImagePath(
        updatedUser?.profileImageUrl,
      );

      if (
        existingImagePath &&
        updatedImagePath &&
        existingImagePath !== updatedImagePath
      ) {
        await fs.unlink(existingImagePath).catch(() => null);
      }

      return res.json(updatedUser);
    } catch (error) {
      logger.error(
        `Error uploading user profile image: ${error.message || error}`,
      );
      return res.status(500).json({ error: "Failed to upload profile image" });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      let updateData = req.body;

      const allowedFields = ["name", "email", "pin", "profileImageUrl"];

      updateData = Object.fromEntries(
        Object.entries(updateData).filter(([key]) =>
          allowedFields.includes(key),
        ),
      );

      if (Object.keys(updateData).length === 0) {
        logger.warn(`Profile update attempt with no valid fields by ${userId}`);
        return res.status(400).json({ error: "No valid fields to update." });
      }

      const updatedUser = await usersService.updateUser(userId, updateData);
      return res.json(updatedUser);
    } catch (error) {
      logger.error(`Error updating user profile: ${error.message || error}`);
      return res.status(500).json({ error: "Failed to update user profile" });
    }
  },

  toggleUserActiveStatus: async (req, res) => {
    try {
      const userId = req.params.id;
      const updatedUser = await usersService.toggleUserActiveStatus(userId);

      return res.status(200).json({
        message: "User status updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      if (error.message === "User not found.") {
        return res.status(404).json({ message: "User not found" });
      }

      logger.error(
        `Error toggling user active status: ${error.message || error}`,
      );
      return res.status(500).json({
        message: "Failed to update user status",
      });
    }
  },

  createUser: async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      const bcrypt = await import("bcrypt");
      const passwordHash = await bcrypt.default.hash(password, 10);
      const newUser = await usersService.createUser({
        ...userData,
        passwordHash,
      });
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
