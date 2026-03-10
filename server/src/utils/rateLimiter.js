import { rateLimit } from "express-rate-limit";

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    handler: (req, res) => {
        const retryAfter = res.getHeader("Retry-After");
        const minutes = Math.ceil(retryAfter / 60);
        res.status(429).json({
            message: `Too many requests. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
            retryAfter: retryAfter
        })
    },
    standardHeaders: true,
    legacyHeaders: false,
    ipv6Subnet: 56
})

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  handler: (req, res) => {
    const retryAfter = res.getHeader("Retry-After");
    const minutes = Math.ceil(retryAfter / 60);
    res.status(429).json({
      message: `Too many requests. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
      retryAfter: retryAfter,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  ipv6Subnet: 56
});