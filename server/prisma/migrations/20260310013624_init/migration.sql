/*
  Warnings:

  - You are about to drop the column `passwordResetToken` on the `password_resets` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetTokenExpires` on the `password_resets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "password_resets" DROP COLUMN "passwordResetToken",
DROP COLUMN "passwordResetTokenExpires",
ADD COLUMN     "passwordResetCode" TEXT,
ADD COLUMN     "passwordResetCodeExpires" TIMESTAMP(3);
