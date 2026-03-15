import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/auth.middleware.js";
import { requireAdminOrSelf } from "../middlewares/auth.middleware.js";
import { usersController } from "../controllers/users.controller.js";

const router = express.Router();
router.use(authenticateToken);

// Get all users (admin only)
router.get(
  "/",
    requireRole("ADMIN"),
    usersController.getAllUsers,
);

// Get user by ID (admin and user themselves)
router.get(
  "/:id",
    requireAdminOrSelf("id"),
    usersController.getUserById,
);

// Update user (admin and user themselves)
router.put(
  "/:id",
    requireAdminOrSelf("id"),
    usersController.updateUser,
);

// Delete user (admin only)
router.delete(
  "/:id",
    requireRole("ADMIN"),
    usersController.deleteUser,
);

export { router as usersRouter };