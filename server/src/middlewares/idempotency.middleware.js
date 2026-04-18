import { idempotencyService } from "../services/idempotency.service.js";
import { hashRequestPayload } from "../utils/requestHash.js";
import { logger } from "../utils/logger.js";
import { metrics } from "../utils/metrics.js";

const DEFAULT_WAIT_MS = Number(process.env.IDEMPOTENCY_WAIT_MS || 6000);

const isMissingIdempotencyTableError = (error) => {
  return error?.code === "P2021";
};

export const requireIdempotencyKey = (req, res, next) => {
  const idempotencyKey = req.get("Idempotency-Key");
  if (!idempotencyKey || !String(idempotencyKey).trim()) {
    return res
      .status(400)
      .json({ error: "Idempotency-Key header is required" });
  }

  req.idempotencyKey = String(idempotencyKey).trim();
  return next();
};

export const idempotencyMiddleware = (endpoint) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const idempotencyKey = req.idempotencyKey;
      const requestHash = hashRequestPayload({
        method: req.method,
        path: endpoint,
        body: req.body,
      });

      const beginResult = await idempotencyService.begin({
        idempotencyKey,
        endpoint,
        userId,
        requestHash,
      });

      if (beginResult.mode === "disabled") {
        req.idempotency = {
          disabled: true,
          key: idempotencyKey,
          endpoint,
          requestHash,
        };
        return next();
      }

      if (beginResult.mode === "hash_mismatch") {
        metrics.increment("payments.idempotency_conflict", 1, { endpoint });
        return res.status(409).json({
          error: "Idempotency key already used with a different payload",
        });
      }

      if (beginResult.mode === "duplicate") {
        const existing = beginResult.record;

        if (existing.state === "COMPLETED" || existing.state === "FAILED") {
          metrics.increment("payments.idempotency_replay", 1, { endpoint });
          return res
            .status(existing.statusCode || 200)
            .json(existing.responseBody);
        }

        const settled = await idempotencyService.waitForCompletion(
          existing.id,
          DEFAULT_WAIT_MS,
        );

        if (
          settled &&
          (settled.state === "COMPLETED" || settled.state === "FAILED")
        ) {
          metrics.increment("payments.idempotency_wait_replay", 1, {
            endpoint,
          });
          return res
            .status(settled.statusCode || 200)
            .json(settled.responseBody);
        }

        metrics.increment("payments.idempotency_inflight_timeout", 1, {
          endpoint,
        });
        return res.status(409).json({
          error: "A request with this Idempotency-Key is still processing",
        });
      }

      const ownerRecord = beginResult.record;
      let responseCaptured = false;
      let capturedBody = null;
      let capturedStatusCode = 200;

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        responseCaptured = true;
        capturedBody = body;
        capturedStatusCode = res.statusCode;
        return originalJson(body);
      };

      res.on("finish", async () => {
        if (!responseCaptured) {
          return;
        }

        try {
          if (capturedStatusCode >= 500) {
            await idempotencyService.fail({
              recordId: ownerRecord.id,
              statusCode: capturedStatusCode,
              responseBody: capturedBody,
            });
          } else {
            await idempotencyService.complete({
              recordId: ownerRecord.id,
              statusCode: capturedStatusCode,
              responseBody: capturedBody,
            });
          }
        } catch (error) {
          logger.error(
            `Failed to finalize idempotency record ${ownerRecord.id}: ${error?.message || error}`,
          );
        }
      });

      req.idempotency = {
        id: ownerRecord.id,
        key: idempotencyKey,
        endpoint,
        requestHash,
      };
      next();
    } catch (error) {
      if (isMissingIdempotencyTableError(error)) {
        logger.warn(
          `Idempotency storage unavailable for ${endpoint}; continuing without request deduplication`,
        );

        req.idempotency = {
          disabled: true,
          key: req.idempotencyKey,
          endpoint,
        };
        return next();
      }

      logger.error(`Idempotency middleware error: ${error?.message || error}`);
      return res.status(500).json({ error: "Idempotency handling failed" });
    }
  };
};
