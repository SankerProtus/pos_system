import crypto from "crypto";

export const correlationMiddleware = (req, res, next) => {
  const incoming = req.get("x-correlation-id");
  const correlationId =
    incoming && String(incoming).trim()
      ? String(incoming).trim()
      : crypto.randomUUID();

  req.correlationId = correlationId;
  res.set("x-correlation-id", correlationId);
  next();
};
