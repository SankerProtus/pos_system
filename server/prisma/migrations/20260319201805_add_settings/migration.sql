/*
  Warnings:

  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "settings";

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "storeName" VARCHAR(100) NOT NULL,
    "storeAddress" TEXT,
    "storeTaxId" VARCHAR(30),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "theme" VARCHAR(20) NOT NULL DEFAULT 'light',
    "receiptFooter" TEXT,
    "businessHours" TEXT,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
