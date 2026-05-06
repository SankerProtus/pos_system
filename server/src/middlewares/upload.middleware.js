import fs from "fs";
import path from "path";
import multer from "multer";

const profileImageUploadDir = path.resolve(
  process.cwd(),
  "uploads",
  "profile-images",
);

fs.mkdirSync(profileImageUploadDir, { recursive: true });

const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileImageUploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = extension || ".jpg";
    const timestamp = Date.now();
    const randomPart = Math.round(Math.random() * 1e9);
    cb(
      null,
      `user-${req.user?.id || "profile"}-${timestamp}-${randomPart}${safeExtension}`,
    );
  },
});

const imageOnlyFilter = (req, file, cb) => {
  if (!file.mimetype?.startsWith("image/")) {
    return cb(new Error("Only image files are allowed."));
  }

  return cb(null, true);
};

const uploadProfileImage = multer({
  storage: profileImageStorage,
  fileFilter: imageOnlyFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
}).single("profileImage");

export const profileImageUploadMiddleware = (req, res, next) => {
  uploadProfileImage(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return next();
  });
};
