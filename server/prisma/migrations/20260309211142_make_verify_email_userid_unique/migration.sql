/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `verify_emails` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "verify_emails_userId_key" ON "verify_emails"("userId");
