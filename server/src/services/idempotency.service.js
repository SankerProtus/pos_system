import { Prisma } from "@prisma/client";
import { prisma } from "../lib/Prisma.js";

const IN_PROGRESS = "IN_PROGRESS";
const COMPLETED = "COMPLETED";
const FAILED = "FAILED";

const IDEMPOTENCY_TTL_HOURS = Number(process.env.IDEMPOTENCY_TTL_HOURS || 24);

const buildExpiry = () => {
  return new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isMissingIdempotencyTableError = (error) => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
};

export const idempotencyService = {
  async begin({ idempotencyKey, endpoint, userId, requestHash }) {
    const expiresAt = buildExpiry();

    try {
      const record = await prisma.paymentIdempotency.create({
        data: {
          idempotencyKey,
          endpoint,
          userId,
          requestHash,
          state: IN_PROGRESS,
          expiresAt,
        },
      });

      return { mode: "owner", record };
    } catch (error) {
      if (isMissingIdempotencyTableError(error)) {
        return { mode: "disabled" };
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.paymentIdempotency.findUnique({
          where: {
            idempotencyKey_endpoint_userId: {
              idempotencyKey,
              endpoint,
              userId,
            },
          },
        });

        if (!existing) {
          throw error;
        }

        if (existing.requestHash !== requestHash) {
          return { mode: "hash_mismatch", record: existing };
        }

        return { mode: "duplicate", record: existing };
      }

      throw error;
    }
  },

  async waitForCompletion(recordId, timeoutMs = 6000, intervalMs = 150) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const record = await prisma.paymentIdempotency.findUnique({
        where: { id: recordId },
      });

      if (!record) {
        return null;
      }

      if (record.state === COMPLETED || record.state === FAILED) {
        return record;
      }

      await sleep(intervalMs);
    }

    return null;
  },

  async complete({ recordId, statusCode, responseBody }) {
    return prisma.paymentIdempotency.update({
      where: { id: recordId },
      data: {
        state: COMPLETED,
        statusCode,
        responseBody,
        processedAt: new Date(),
      },
    });
  },

  async fail({ recordId, statusCode, responseBody }) {
    return prisma.paymentIdempotency.update({
      where: { id: recordId },
      data: {
        state: FAILED,
        statusCode,
        responseBody,
        processedAt: new Date(),
      },
    });
  },

  async cleanupExpired() {
    try {
      const result = await prisma.paymentIdempotency.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              AND: [
                { state: { in: [COMPLETED, FAILED] } },
                {
                  processedAt: {
                    lt: new Date(
                      Date.now() - IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
                    ),
                  },
                },
              ],
            },
          ],
        },
      });

      return result.count;
    } catch (error) {
      if (isMissingIdempotencyTableError(error)) {
        return 0;
      }

      throw error;
    }
  },
};
