export const createTtlCache = ({
  defaultTtlMs = 30_000,
  maxEntries = 500,
} = {}) => {
  const store = new Map();

  const prune = () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) {
        store.delete(key);
      }
    }

    if (store.size <= maxEntries) {
      return;
    }

    const entries = Array.from(store.entries()).sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt,
    );
    while (entries.length > 0 && store.size > maxEntries) {
      const [key] = entries.shift();
      store.delete(key);
    }
  };

  return {
    get: (key) => {
      const entry = store.get(key);
      if (!entry) {
        return null;
      }

      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
      }

      return entry.value;
    },

    set: (key, value, ttlMs = defaultTtlMs) => {
      prune();
      store.set(key, {
        value,
        expiresAt: Date.now() + Math.max(1, Number(ttlMs) || defaultTtlMs),
      });
      return value;
    },

    del: (key) => {
      store.delete(key);
    },

    clear: () => {
      store.clear();
    },
  };
};
