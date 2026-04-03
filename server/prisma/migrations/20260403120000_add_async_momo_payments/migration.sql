-- Add new sale status for failed/expired async payment flows.
ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Payment status enum for asynchronous provider lifecycle.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
  END IF;
END
$$;

-- Extend payments for asynchronous MoMo orchestration.
ALTER TABLE "payments"
ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "amount" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "providerStatus" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill deterministic values before adding stricter constraints.
UPDATE "payments"
SET "amount" = COALESCE("amount", "amountPaid")
WHERE "amount" IS NULL;

UPDATE "payments"
SET "reference" = COALESCE("reference", 'LEGACY-' || "id")
WHERE "reference" IS NULL;

ALTER TABLE "payments"
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "reference" SET NOT NULL;

-- Keep one globally unique provider reference.
CREATE UNIQUE INDEX IF NOT EXISTS "payments_reference_key" ON "payments"("reference");

-- Add idempotency ledger for webhook retries and duplicates.
CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "providerEventId" VARCHAR(140) NOT NULL,
  "reference" VARCHAR(100) NOT NULL,
  "eventType" VARCHAR(80) NOT NULL,
  "status" VARCHAR(40),
  "signature" VARCHAR(255),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "paymentId" TEXT,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_providerEventId_key"
ON "payment_webhook_events"("providerEventId");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_reference_idx"
ON "payment_webhook_events"("reference");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_paymentId_idx"
ON "payment_webhook_events"("paymentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_webhook_events_paymentId_fkey'
  ) THEN
    ALTER TABLE "payment_webhook_events"
    ADD CONSTRAINT "payment_webhook_events_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
