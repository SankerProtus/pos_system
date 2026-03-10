export const welcomeEmailTemplate = (name) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h1 style="color: #4CAF50;">Welcome to POS System, ${name}!</h1>
    <p>Thank you for signing up for our POS System. We're excited to have you on board!</p>
    <p>With our system, you can manage your sales, inventory, and customers all in one place.</p>
    <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
    <p>Best regards,<br/>The POS System Team</p>
  </div>
`;

export const emailVerificationTemplate = (code) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h1 style="color: #4CAF50;">Email Verification - POS System</h1>
    <p>Thank you for signing up for our POS System. To complete your registration, please use the following verification code:</p>
    <h2 style="color: #4CAF50;">${code}</h2>
    <p>This code will expire in 15 minutes. If you did not request this verification, please ignore this email.</p>
    <p>Best regards,<br/>The POS System Team</p>
  </div>
`;

export const passwordResetTemplate = (code) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h1 style="color: #4CAF50;">Password Reset Request - POS System</h1>
    <p>We received a request to reset your password for your POS System account. To reset your password, please use the following verification code:</p>
    <h2 style="color: #4CAF50;">${code}</h2>
    <p>This code will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
    <p>Best regards,<br/>The POS System Team</p>
  </div>
`;