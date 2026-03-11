import { prisma } from "../../lib/Prisma.js";
import { transporter } from "../transporter.js";
import {
  welcomeEmailTemplate,
  emailVerificationTemplate,
  passwordResetTemplate,
  accountVerificationSuccessTemplate,
  passwordResetSuccessTemplate,
} from "../templates/emailVerificationTemplate.js";
import { logger } from "../../utils/logger.js";

export const emailService = {
    sendWelcomeEmail: async (user) => {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Welcome to POS System!",
                html: welcomeEmailTemplate(user.name),
            });
        } catch (err) {
            logger.error("Error occurred while sending welcome email:", err.message || err);
        }
    },
    sendVerificationEmail: async (user) => {
    try {
      // Generate a random 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString();

      await prisma.verifyEmail.deleteMany({
        where: { userId: user.id },
      });

      // Save the verification code and token in the database
      await prisma.verifyEmail.create({
        data: {
          userId: user.id,
          verificationCode: code,
        //   Code expires in 15 minutes
          verificationCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const html = emailVerificationTemplate(code);
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Email Verification - POS System",
        html,
      });
    } catch (err) {
      logger.error("Error occurred while sending verification email:", err);
    }
    },
    sendPasswordResetEmail: async (user, resetCode) => {
        try {

            const html = passwordResetTemplate(resetCode);
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Password Reset Request - POS System",
                html,
            });
        } catch (err) {
            logger.error("Error occurred while sending password reset email:", err.message || err);
        }
    },

    sendAccountVerificationSuccessEmail: async (user) => {
        try {
            const html = accountVerificationSuccessTemplate(user.name);
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Account Verified - POS System",
                html,
            });
        } catch (err) {
            logger.error("Error occurred while sending account verification success email:", err.message || err);
        }
    },

    sendPasswordResetSuccessEmail: async (user) => {
        try {
            const html = passwordResetSuccessTemplate(user.name);
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Password Reset Successful - POS System",
                html,
            });
        } catch (err) {
            logger.error("Error occurred while sending password reset success email:", err.message || err);
        }
    },
};
