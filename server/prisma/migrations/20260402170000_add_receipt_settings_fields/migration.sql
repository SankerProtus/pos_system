-- AlterTable
ALTER TABLE "Setting"
ADD COLUMN "receiptHeaderText" TEXT,
ADD COLUMN "receiptPaperWidth" VARCHAR(10) NOT NULL DEFAULT '80mm',
ADD COLUMN "autoPrint" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showLoyaltyPoints" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showStoreLogo" BOOLEAN NOT NULL DEFAULT false;
