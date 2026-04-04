import { prisma } from "../lib/Prisma.js";
import { logger } from "../utils/logger.js";

export const auditService = {
  log: async ({
    userId = null,
    action,
    targetType,
    targetId,
    before = null,
    after = null,
    ipAddress = null,
    userAgent = null,
  }) => {
    if (!action || !targetType || !targetId) {
      return;
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: String(action).slice(0, 60),
          targetType: String(targetType).slice(0, 50),
          targetId: String(targetId).slice(0, 50),
          before,
          after,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      logger.error(
        `Audit log failed: ${error?.message || error} action=${action} targetType=${targetType}`,
      );
    }
  },
};
