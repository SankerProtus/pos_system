import { prisma } from "../lib/Prisma.js";

const parseDate = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const toNumber = (value) => Number(value || 0);

const parsePagination = ({ page, pageSize }) => {
  const p = Math.max(1, Number(page) || 1);
  const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return { page: p, pageSize: ps, skip: (p - 1) * ps, take: ps };
};

export const paymentsReconciliationService = {
  async buildReport({ from, to, page, pageSize, status, providerStatus }) {
    const now = new Date();
    const fromDate = parseDate(
      from,
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
    );
    const toDate = parseDate(to, now);

    const {
      skip,
      take,
      page: currentPage,
      pageSize: currentPageSize,
    } = parsePagination({
      page,
      pageSize,
    });

    const baseWhere = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(providerStatus
        ? { providerStatus: { equals: String(providerStatus).toUpperCase() } }
        : {}),
    };

    const [internalTotals, providerTotals, exceptions, totalExceptions] =
      await Promise.all([
        prisma.payment.groupBy({
          by: ["status"],
          where: baseWhere,
          _sum: {
            amount: true,
            amountPaid: true,
          },
          _count: {
            _all: true,
          },
        }),
        prisma.payment.groupBy({
          by: ["providerStatus"],
          where: baseWhere,
          _sum: {
            amount: true,
            amountPaid: true,
          },
          _count: {
            _all: true,
          },
        }),
        prisma.payment.findMany({
          where: {
            ...baseWhere,
            OR: [
              {
                status: "SUCCESS",
                sale: {
                  status: { not: "COMPLETED" },
                },
              },
              {
                status: "FAILED",
                sale: {
                  status: "COMPLETED",
                },
              },
              {
                method: "MOBILE_MONEY",
                webhookEvents: {
                  none: {},
                },
              },
            ],
          },
          include: {
            sale: {
              select: {
                id: true,
                status: true,
                totalAmount: true,
              },
            },
            webhookEvents: {
              select: {
                id: true,
                eventType: true,
                status: true,
                receivedAt: true,
              },
              take: 1,
              orderBy: {
                receivedAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take,
        }),
        prisma.payment.count({
          where: {
            ...baseWhere,
            OR: [
              {
                status: "SUCCESS",
                sale: {
                  status: { not: "COMPLETED" },
                },
              },
              {
                status: "FAILED",
                sale: {
                  status: "COMPLETED",
                },
              },
              {
                method: "MOBILE_MONEY",
                webhookEvents: {
                  none: {},
                },
              },
            ],
          },
        }),
      ]);

    const mappedExceptions = exceptions.map((payment) => {
      let exceptionType = "UNKNOWN";

      if (
        payment.status === "SUCCESS" &&
        payment.sale?.status !== "COMPLETED"
      ) {
        exceptionType = "SUCCESS_WITH_NON_COMPLETED_SALE";
      } else if (
        payment.status === "FAILED" &&
        payment.sale?.status === "COMPLETED"
      ) {
        exceptionType = "FAILED_WITH_COMPLETED_SALE";
      } else if (
        payment.method === "MOBILE_MONEY" &&
        (!payment.webhookEvents || payment.webhookEvents.length === 0)
      ) {
        exceptionType = "MISSING_WEBHOOK_EVENT";
      }

      return {
        exceptionType,
        paymentId: payment.id,
        reference: payment.reference,
        paymentStatus: payment.status,
        providerStatus: payment.providerStatus,
        amount: toNumber(payment.amount),
        amountPaid: toNumber(payment.amountPaid),
        saleId: payment.sale?.id || null,
        saleStatus: payment.sale?.status || null,
        latestWebhookEventType: payment.webhookEvents?.[0]?.eventType || null,
        latestWebhookStatus: payment.webhookEvents?.[0]?.status || null,
        createdAt: payment.createdAt,
        processedAt: payment.processedAt,
      };
    });

    return {
      filters: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        status: status || null,
        providerStatus: providerStatus || null,
        page: currentPage,
        pageSize: currentPageSize,
      },
      totalsByInternalStatus: internalTotals.map((row) => ({
        status: row.status,
        count: row._count._all,
        amount: toNumber(row._sum.amount),
        amountPaid: toNumber(row._sum.amountPaid),
      })),
      totalsByProviderStatus: providerTotals.map((row) => ({
        providerStatus: row.providerStatus || "UNKNOWN",
        count: row._count._all,
        amount: toNumber(row._sum.amount),
        amountPaid: toNumber(row._sum.amountPaid),
      })),
      exceptions: mappedExceptions,
      pagination: {
        page: currentPage,
        pageSize: currentPageSize,
        total: totalExceptions,
      },
      generatedAt: new Date().toISOString(),
    };
  },
};
