-- Speed up common POS and reporting query patterns
CREATE INDEX IF NOT EXISTS "sales_status_createdAt_idx"
ON "sales" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "sales_userId_createdAt_idx"
ON "sales" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "sale_items_productId_saleId_idx"
ON "sale_items" ("productId", "saleId");

CREATE INDEX IF NOT EXISTS "payments_status_idx"
ON "payments" ("status");

CREATE INDEX IF NOT EXISTS "payments_status_createdAt_idx"
ON "payments" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "payments_providerStatus_createdAt_idx"
ON "payments" ("providerStatus", "createdAt");
