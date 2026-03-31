import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error, _success) => {
  if (error) {
    console.log("❌ Error setting up email transporter:", error);
  } else {
    console.log("✅ Email transporter is ready to send messages");
  }
});
