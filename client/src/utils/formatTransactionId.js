export const resolveTransactionId = (record) => {
  if (typeof record === "string") {
    const value = record.trim();
    return value || "N/A";
  }

  if (!record || typeof record !== "object") {
    return "N/A";
  }

  return (
    record?.receipt?.receiptNumber ||
    record?.receiptNumber ||
    record?.payment?.reference ||
    record?.reference ||
    record?.id ||
    "N/A"
  );
};

export const formatTransactionId = (rawTxnId) => {
  const raw = String(rawTxnId || "").trim();
  if (!raw || raw === "N/A") {
    return "N/A";
  }

  if (raw.startsWith("RCP-")) {
    return raw;
  }

  if (/^MOMO-/i.test(raw)) {
    const compact = raw.replace(/^MOMO-/i, "").replace(/[^a-zA-Z0-9]/g, "");
    const suffix = compact.slice(-8).toUpperCase();
    return suffix ? `MOMO-${suffix}` : "MOMO";
  }

  if (
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      raw,
    )
  ) {
    return `TXN-${raw.slice(0, 8).toUpperCase()}`;
  }

  if (raw.length > 24) {
    return `${raw.slice(0, 8)}...${raw.slice(-6)}`;
  }

  return raw;
};
