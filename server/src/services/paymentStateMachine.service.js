import { logger } from "../utils/logger.js";

const terminalStatuses = new Set(["SUCCESS", "FAILED"]);
const allowedTransitions = {
  PENDING: new Set(["SUCCESS", "FAILED"]),
  SUCCESS: new Set([]),
  FAILED: new Set([]),
};

const normalize = (value) => String(value || "").toUpperCase();

export const paymentStateMachine = {
  isTerminal(status) {
    return terminalStatuses.has(normalize(status));
  },

  canTransition(fromStatus, toStatus, { allowTerminalOverride = false } = {}) {
    const from = normalize(fromStatus);
    const to = normalize(toStatus);

    if (!from || !to) {
      return false;
    }

    if (from === to) {
      return true;
    }

    if (terminalStatuses.has(from) && !allowTerminalOverride) {
      return false;
    }

    return Boolean(allowedTransitions[from]?.has(to));
  },

  assertTransition({
    fromStatus,
    toStatus,
    reference,
    source,
    allowTerminalOverride = false,
  }) {
    const allowed = paymentStateMachine.canTransition(fromStatus, toStatus, {
      allowTerminalOverride,
    });

    if (!allowed) {
      logger.warn(
        JSON.stringify({
          event: "payment.transition_rejected",
          reference: reference || null,
          source: source || "unknown",
          fromStatus: normalize(fromStatus),
          toStatus: normalize(toStatus),
        }),
      );
      const error = new Error(
        `Illegal payment transition from ${normalize(fromStatus)} to ${normalize(toStatus)}`,
      );
      error.statusCode = 409;
      throw error;
    }
  },
};
