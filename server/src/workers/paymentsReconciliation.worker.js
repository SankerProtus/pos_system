import { prisma } from "../lib/Prisma.js";
import { logger } from "../utils/logger.js";
import { metrics } from "../utils/metrics.js";
import { idempotencyService } from "../services/idempotency.service.js";
import { mobileMoneyService } from "../services/mobileMoney.service.js";

const RECONCILE_INTERVAL_MS = Number(
  process.env.PAYMENTS_RECONCILE_INTERVAL_MS || 30_000,
);
const MAX_PAYMENTS_PER_RUN = Number(
  process.env.PAYMENTS_RECONCILE_BATCH_SIZE || 50,
);
const STUCK_PAYMENT_ALERT_MINUTES = Number(
  process.env.PAYMENTS_STUCK_ALERT_MINUTES || 20,
);

let timer = null;
let isRunning = false;

const runCycle = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;
  const startedAt = Date.now();

  try {
    const candidates = await prisma.payment.findMany({
      where: {
        method: "MOBILE_MONEY",
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
      take: MAX_PAYMENTS_PER_RUN,
      select: {
        reference: true,
        createdAt: true,
      },
    });

    for (const payment of candidates) {
      try {
        await mobileMoneyService.reconcilePaymentByReference(
          payment.reference,
          {
            source: "worker",
          },
        );

        const pendingMinutes =
          (Date.now() - new Date(payment.createdAt).getTime()) / 60000;
        if (pendingMinutes >= STUCK_PAYMENT_ALERT_MINUTES) {
          logger.warn(
            JSON.stringify({
              event: "payment.pending_stuck",
              reference: payment.reference,
              pendingMinutes: Math.floor(pendingMinutes),
              thresholdMinutes: STUCK_PAYMENT_ALERT_MINUTES,
            }),
          );
        }
      } catch (error) {
        metrics.increment("payments.reconcile.item_failed", 1);
        logger.error(
          `Reconciliation failed for ${payment.reference}: ${error?.message || error}`,
        );
      }
    }

    let cleaned = 0;
    try {
      cleaned = await idempotencyService.cleanupExpired();
      metrics.increment("payments.idempotency.cleanup_count", cleaned);
    } catch (error) {
      metrics.increment("payments.idempotency.cleanup_failed", 1);
      logger.warn(`Idempotency cleanup skipped: ${error?.message || error}`);
    }
    metrics.increment("payments.reconcile.run_success", 1);
  } catch (error) {
    metrics.increment("payments.reconcile.run_failed", 1);
    logger.error(
      `Payment reconciliation cycle failed: ${error?.message || error}`,
    );
  } finally {
    metrics.timing("payments.reconcile.run_ms", Date.now() - startedAt);
    isRunning = false;
  }
};

export const paymentsReconciliationWorker = {
  start() {
    if (timer) {
      return;
    }

    timer = setInterval(() => {
      void runCycle();
    }, RECONCILE_INTERVAL_MS);

    void runCycle();
  },

  stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  },
};
