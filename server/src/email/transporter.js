import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

export const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error, _success) => {
  if (error) {
    logger.error("Error setting up email transporter:", error);
  } else {
    logger.info("Email transporter is ready to send messages");
  }
});
