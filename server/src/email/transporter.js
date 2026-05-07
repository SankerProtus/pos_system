import nodemailer from "nodemailer";
import dns from "dns";

try {
  dns.setDefaultResultOrder && dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // ignore if not supported
}

export const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || undefined,
  host: process.env.EMAIL_HOST || undefined,
  port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
  secure: process.env.EMAIL_SECURE === "true" ? true : false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  requireTLS: true,
});

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter.verify((error, _success) => {
    if (error) {
      console.warn(
        "Email transporter verification failed:",
        error.message || error,
      );
    } else {
      console.log("Email transporter is ready to send messages");
    }
  });
}
