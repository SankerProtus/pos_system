const counters = new Map();

export const metrics = {
  increment: (name, value = 1, tags = {}) => {
    const key = `${name}:${JSON.stringify(tags)}`;
    counters.set(key, (counters.get(key) || 0) + value);
  },

  timing: (name, durationMs, tags = {}) => {
    const bucket =
      durationMs < 100
        ? "lt_100ms"
        : durationMs < 500
          ? "lt_500ms"
          : durationMs < 2000
            ? "lt_2000ms"
            : "gte_2000ms";

    metrics.increment(`${name}_count`, 1, tags);
    metrics.increment(`${name}_${bucket}`, 1, tags);
  },

  snapshot: () => {
    return Array.from(counters.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  },
};
