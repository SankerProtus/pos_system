import * as z from "zod";

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters long")
      .max(100, "Full name is too long"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
    role: z.enum(["CASHIER", "MANAGER", "ADMIN"], {
      errorMap: () => ({
        message: "Please select a valid role: Admin, Manager, or Cashier.",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    // Shows error under confirmPassword field
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export const resendVerificationEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
