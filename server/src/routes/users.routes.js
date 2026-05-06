import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/auth.middleware.js";
import { requireAdminOrSelf } from "../middlewares/auth.middleware.js";
import { usersController } from "../controllers/users.controller.js";
import { profileImageUploadMiddleware } from "../middlewares/upload.middleware.js";

const router = express.Router();
router.use(authenticateToken);

// Get authenticated user's profile
router.get("/profile", usersController.getProfile);
router.patch("/profile", usersController.updateProfile);

// Get all users (admin only)
router.get("/", requireRole("ADMIN"), usersController.getAllUsers);

// Get user by ID (admin and user themselves)
router.get("/:id", requireAdminOrSelf("id"), usersController.getUserById);

// Update user (admin and user themselves)
router.patch("/:id", requireAdminOrSelf("id"), usersController.updateUser);
router.patch(
  "/:id/profile-image",
  requireAdminOrSelf("id"),
  profileImageUploadMiddleware,
  usersController.uploadProfileImage,
);

// Toggle user active status (admin only)
router.patch(
  "/:id/toggle-active",
  requireRole("ADMIN"),
  usersController.toggleUserActiveStatus,
);

// Add a new user (admin only)
router.post("/", requireRole("ADMIN"), usersController.createUser);

// Delete user (admin only)
router.delete("/:id", requireRole("ADMIN"), usersController.deleteUser);

export { router as usersRouter };
