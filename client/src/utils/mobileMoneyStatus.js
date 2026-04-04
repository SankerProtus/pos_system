const CANCELLATION_PATTERNS = [
  /cancel(?:led)?/i,
  /rejected/i,
  /denied/i,
  /not approved/i,
  /failed by user/i,
  /user cancelled/i,
  /customer.*(cancel|reject|deny)/i,
  /(cancel|reject|deny).*customer/i,
];

const DECLINE_PATTERNS = [
  /declin(?:ed|e)/i,
  /insufficient funds/i,
  /not enough balance/i,
  /balance too low/i,
];

const TIMEOUT_PATTERNS = [
  /timed?\s*out/i,
  /timeout/i,
  /expired/i,
  /took too long/i,
];

export const getMobileMoneyFailureType = (message) => {
  const text = String(message || "").trim();
  if (!text) {
    return null;
  }

  if (TIMEOUT_PATTERNS.some((pattern) => pattern.test(text))) {
    return "TIMEOUT";
  }

  if (DECLINE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "DECLINED";
  }

  if (CANCELLATION_PATTERNS.some((pattern) => pattern.test(text))) {
    return "CANCELLED";
  }

  return null;
};

export const isTerminalMobileMoneyFailure = (message) =>
  Boolean(getMobileMoneyFailureType(message));

export const toMobileMoneyFailureMessage = (
  message,
  fallback = "Mobile money payment failed",
) => {
  const failureType = getMobileMoneyFailureType(message);

  if (failureType === "TIMEOUT") {
    return "Payment request timed out before customer authorization.";
  }

  if (failureType === "DECLINED") {
    return "Customer declined the payment authorization.";
  }

  if (failureType === "CANCELLED") {
    return "Customer cancelled the payment authorization.";
  }

  return String(message || fallback);
};
