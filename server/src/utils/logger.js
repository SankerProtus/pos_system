import { createLogger, format, transports } from "winston";

const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp, ...meta }) => {
  const metaEntries = Object.entries(meta || {}).filter(
    ([key]) => !["splat"].includes(key),
  );
  const metaText =
    metaEntries.length > 0
      ? ` ${JSON.stringify(Object.fromEntries(metaEntries))}`
      : "";
  return `${timestamp} [${label}] ${level}: ${message}${metaText}`;
});

export const logger = createLogger({
  level: "info",
  format: combine(label({ label: "SwiftPOS Retail" }), timestamp(), myFormat),
  transports: [
    new transports.File({
      filename: "./logs/error.log",
      level: "error",
    }),
    new transports.File({ filename: "./logs/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.simple(),
    }),
  );
}
