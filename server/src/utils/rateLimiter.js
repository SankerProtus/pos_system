import rateLimit from "express-rate-limit";

// Helper to calculate seconds until reset
function getRetryAfterSeconds(windowMs, currentTime, resetTime) {
  return Math.max(Math.ceil((resetTime - currentTime) / 1000), 1);
}

// General Auth Rate Limiter
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const now = Date.now();
    const resetTime = options.resetTime ? options.resetTime.getTime() : now + options.windowMs;
    const retryAfter = getRetryAfterSeconds(options.windowMs, now, resetTime);

    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({
      message: "Too many requests",
      retryAfter,
    });
  },
});

// Login Rate Limiter
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const now = Date.now();
    const resetTime = options.resetTime ? options.resetTime.getTime() : now + options.windowMs;
    const retryAfter = getRetryAfterSeconds(options.windowMs, now, resetTime);

    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({
      message: "Too many login attempts",
      retryAfter,
    });
  },
});

// Trust proxy for correct IP detection behind proxies
export function setupTrustProxy(app) {
  app.set("trust proxy", 1);
}