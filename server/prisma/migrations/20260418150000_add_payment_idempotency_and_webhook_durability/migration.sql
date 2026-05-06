-- Idempotency state enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdempotencyState') THEN
    CREATE TYPE "IdempotencyState" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');
  END IF;
END $$;

-- Webhook durability columns
ALTER TABLE "payment_webhook_events"
ADD COLUMN IF NOT EXISTS "payloadHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "errorReason" TEXT;

CREATE INDEX IF NOT EXISTS "payment_webhook_events_eventType_receivedAt_idx"
ON "payment_webhook_events"("eventType", "receivedAt");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_signature_receivedAt_idx"
ON "payment_webhook_events"("signature", "receivedAt");

-- Idempotency persistence table
CREATE TABLE IF NOT EXISTS "payment_idempotency" (
  "id" TEXT PRIMARY KEY,
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "endpoint" VARCHAR(80) NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentId" TEXT,
  "requestHash" VARCHAR(64) NOT NULL,
  "state" "IdempotencyState" NOT NULL DEFAULT 'IN_PROGRESS',
  "statusCode" INTEGER,
  "responseBody" JSONB,
  "processedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "payment_idempotency"
ADD CONSTRAINT "payment_idempotency_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_idempotency_idempotencyKey_endpoint_userId_key"
ON "payment_idempotency"("idempotencyKey", "endpoint", "userId");

CREATE INDEX IF NOT EXISTS "payment_idempotency_expiresAt_idx"
ON "payment_idempotency"("expiresAt");

CREATE INDEX IF NOT EXISTS "payment_idempotency_state_createdAt_idx"
ON "payment_idempotency"("state", "createdAt");

CREATE INDEX IF NOT EXISTS "payment_idempotency_userId_createdAt_idx"
ON "payment_idempotency"("userId", "createdAt");
