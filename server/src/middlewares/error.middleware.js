export const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  if (process.env.NODE_ENV === "production") {
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  } else {
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack,
    });
  }
};
