import { paystackService } from "../services/paystack.service.js";
import { mobileMoneyService } from "../services/mobileMoney.service.js";
import { productsService } from "../services/products.service.js";
import { prisma } from "../lib/Prisma.js";
import { logger } from "../utils/logger.js";
import { createTtlCache } from "../lib/ttlCache.js";
import { auditService } from "../services/audit.service.js";
import { metrics } from "../utils/metrics.js";
import { paymentsReconciliationService } from "../services/paymentsReconciliation.service.js";

const defaultEmail =
  process.env.PAYSTACK_DEFAULT_CUSTOMER_EMAIL || "pos@example.com";
const verifyCache = createTtlCache({
  defaultTtlMs: 3 * 1000,
  maxEntries: 1000,
});

const logPaymentEvent = (req, event, extra = {}) => {
  logger.info(
    JSON.stringify({
      event,
      correlationId: req.correlationId || null,
      userId: req.user?.id || null,
      endpoint: `${req.method} ${req.originalUrl}`,
      ...extra,
    }),
  );
};

const isTerminalPaymentStatus = (value) => {
  const status = String(value || "").toUpperCase();
  return ["SUCCESS", "FAILED", "CANCELLED", "CANCELED", "COMPLETED"].includes(
    status,
  );
};

const CARD_PAYMENT_TIMEOUT_MINUTES = Number(
  process.env.CARD_PAYMENT_TIMEOUT_MINUTES || 15,
);

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const resolveCustomerEmail = async ({ customerId, customerEmail }) => {
  if (typeof customerEmail === "string" && customerEmail.trim()) {
    return customerEmail.trim();
  }

  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { email: true },
    });

    if (customer?.email) {
      return customer.email;
    }
  }

  return defaultEmail;
};

const loadCanonicalSaleItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Sale items are required for card payments");
  }

  return Promise.all(
    items.map(async (item) => {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for product: ${item.productId}`);
      }

      const product = await productsService.getProductById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const unitPrice = Number(product.price);
      const discount = Number(item.discount) || 0;
      const subtotal = toMoney(unitPrice * quantity - discount);

      return {
        productId: item.productId,
        productName: product.productName,
        unitPrice,
        quantity,
        discount,
        taxRate: Number(product.taxRate) || 0,
        barcode: item.barcode || product.barcode || null,
        subtotal,
      };
    }),
  );
};

const createPendingCardSale = async ({
  items,
  customerId,
  userId,
  discountAmount,
  notes,
  reference,
}) => {
  if (!userId) {
    throw new Error("Unauthorized: User ID missing");
  }

  const saleItems = await loadCanonicalSaleItems(items);

  const subtotal = toMoney(
    saleItems.reduce((sum, item) => sum + Number(item.subtotal), 0),
  );
  const discount = toMoney(discountAmount || 0);
  const taxAmount = toMoney(
    saleItems.reduce(
      (sum, item) =>
        sum +
        (Number(item.unitPrice) * item.quantity * Number(item.taxRate)) / 100,
      0,
    ),
  );
  const totalAmount = toMoney(subtotal + taxAmount - discount);

  if (totalAmount <= 0) {
    throw new Error("Total amount must be greater than zero");
  }

  const expiresAt = new Date(
    Date.now() + CARD_PAYMENT_TIMEOUT_MINUTES * 60 * 1000,
  );

  const sale = await prisma.$transaction(async (tx) => {
    for (const item of saleItems) {
      const inventory = await tx.inventory.findUnique({
        where: { productId: item.productId },
      });

      if (!inventory) {
        throw new Error(`Inventory not found for product: ${item.productId}`);
      }

      if (inventory.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product: ${item.productName}`);
      }
    }

    return tx.sale.create({
      data: {
        user: { connect: { id: userId } },
        ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
        status: "PENDING",
        subtotal,
        discountAmount: discount,
        taxAmount,
        totalAmount,
        notes: notes || null,
        saleItems: {
          create: saleItems,
        },
        payment: {
          create: {
            method: "CARD",
            status: "PENDING",
            amount: totalAmount,
            amountPaid: 0,
            changeDue: 0,
            reference,
            provider: "PAYSTACK_CARD",
            providerStatus: "INITIATED",
            expiresAt,
          },
        },
      },
      include: {
        user: true,
        customer: true,
        saleItems: true,
        payment: true,
        receipt: true,
      },
    });
  });

  return {
    sale,
    totalAmount,
    expiresAt,
  };
};

export const paymentsController = {
  initialize: async (req, res) => {
    const startedAt = Date.now();
    try {
      const {
        amount,
        paymentMethod,
        customerId,
        customerEmail,
        metadata,
        items,
        phoneNumber,
        network,
        discountAmount,
        notes,
      } = req.body;

      const normalizedMethod = String(paymentMethod || "")
        .trim()
        .toUpperCase();

      if (!["CARD", "MOBILE_MONEY"].includes(normalizedMethod)) {
        return res.status(400).json({
          error:
            "Only CARD and MOBILE_MONEY are supported for Paystack initialization",
        });
      }

      const amountNumber = Number(amount);
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      if (normalizedMethod === "CARD") {
        const reference = `POS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        const cardSale = await createPendingCardSale({
          items,
          customerId: customerId || null,
          userId: req.user?.id,
          discountAmount: Number(discountAmount) || 0,
          notes: notes || metadata?.notes || null,
          reference,
        });

        if (
          Math.round(amountNumber * 100) !==
          Math.round(cardSale.totalAmount * 100)
        ) {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { reference },
              data: {
                status: "FAILED",
                providerStatus: "AMOUNT_MISMATCH",
                failureReason: "Requested amount does not match cart total",
                processedAt: new Date(),
              },
            });

            await tx.sale.update({
              where: { id: cardSale.sale.id },
              data: { status: "CANCELLED" },
            });
          });

          return res.status(400).json({
            error: "Requested amount does not match cart total",
          });
        }

        const resolvedEmail = await resolveCustomerEmail({
          customerId,
          customerEmail,
        });

        let payload;
        try {
          payload = await paystackService.initializeTransaction({
            email: resolvedEmail,
            amount: cardSale.totalAmount,
            channels: ["card"],
            reference,
            metadata: {
              ...(metadata || {}),
              paymentMethod: normalizedMethod,
              customerId: customerId || null,
              initiatedByUserId: req.user?.id || null,
              saleId: cardSale.sale.id,
              paymentId: cardSale.sale.payment?.id || null,
            },
          });
        } catch (error) {
          if (cardSale?.sale?.id) {
            await prisma.$transaction(async (tx) => {
              await tx.payment.update({
                where: { reference },
                data: {
                  status: "FAILED",
                  providerStatus: "INIT_FAILED",
                  failureReason:
                    error?.message || "Failed to initialize card payment",
                  processedAt: new Date(),
                },
              });

              await tx.sale.update({
                where: { id: cardSale.sale.id },
                data: { status: "CANCELLED" },
              });
            });
          }

          throw error;
        }

        const referenceToLog = payload?.reference || reference;
        await auditService.log({
          userId: req.user?.id || null,
          action: "PAYMENT_INIT",
          targetType: "Payment",
          targetId: referenceToLog,
          after: {
            method: normalizedMethod,
            status: "PENDING",
            amount: Number(cardSale.totalAmount),
          },
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || null,
        });

        metrics.increment("payments.initialize.success", 1, {
          method: normalizedMethod,
        });
        metrics.timing(
          "payments.initialize.latency_ms",
          Date.now() - startedAt,
          {
            method: normalizedMethod,
          },
        );
        logPaymentEvent(req, "payment.initialize.success", {
          reference: referenceToLog,
          paymentMethod: normalizedMethod,
          status: "PENDING",
        });

        return res.status(200).json({
          data: {
            reference: referenceToLog,
            authorizationUrl: payload?.authorization_url || null,
            accessCode: payload?.access_code || null,
            saleId: cardSale.sale.id,
            paymentId: cardSale.sale.payment?.id || null,
            saleStatus: cardSale.sale.status || "PENDING",
            amount: cardSale.totalAmount,
            expiresAt: cardSale.expiresAt,
          },
        });
      }

      if (normalizedMethod === "MOBILE_MONEY") {
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            error: "Sale items are required for mobile money payments",
          });
        }

        if (!phoneNumber || !String(phoneNumber).trim()) {
          return res.status(400).json({
            error:
              "Customer phone number is required for mobile money payments",
          });
        }

        const result = await mobileMoneyService.initiatePayment({
          items,
          phoneNumber,
          network,
          customerId,
          customerEmail,
          discountAmount: Number(discountAmount) || 0,
          userId: req.user?.id,
          notes: notes || metadata?.notes || null,
        });

        await auditService.log({
          userId: req.user?.id || null,
          action: "PAYMENT_INIT",
          targetType: "Payment",
          targetId: result?.reference || "UNKNOWN",
          after: {
            method: normalizedMethod,
            status: result?.status || "PENDING",
            amount: Number(amountNumber),
          },
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || null,
        });

        metrics.increment("payments.initialize.success", 1, {
          method: normalizedMethod,
        });
        metrics.timing(
          "payments.initialize.latency_ms",
          Date.now() - startedAt,
          {
            method: normalizedMethod,
          },
        );
        logPaymentEvent(req, "payment.initialize.success", {
          reference: result?.reference || null,
          paymentMethod: normalizedMethod,
          status: result?.status || "PENDING",
        });

        return res.status(200).json({ data: result });
      }

      let resolvedEmail =
        typeof customerEmail === "string" && customerEmail.trim()
          ? customerEmail.trim()
          : null;

      if (!resolvedEmail && customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { email: true },
        });
        resolvedEmail = customer?.email || null;
      }

      if (!resolvedEmail) {
        resolvedEmail = defaultEmail;
      }

      const channels =
        normalizedMethod === "CARD" ? ["card"] : ["mobile_money"];

      const reference = `POS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const payload = await paystackService.initializeTransaction({
        email: resolvedEmail,
        amount: amountNumber,
        channels,
        reference,
        metadata: {
          ...(metadata || {}),
          paymentMethod: normalizedMethod,
          customerId: customerId || null,
          initiatedByUserId: req.user?.id || null,
        },
      });

      const referenceToLog = payload?.reference || reference;
      await auditService.log({
        userId: req.user?.id || null,
        action: "PAYMENT_INIT",
        targetType: "Payment",
        targetId: referenceToLog,
        after: {
          method: normalizedMethod,
          status: "PENDING",
          amount: Number(amountNumber),
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      });

      metrics.increment("payments.initialize.success", 1, {
        method: normalizedMethod,
      });
      metrics.timing("payments.initialize.latency_ms", Date.now() - startedAt, {
        method: normalizedMethod,
      });
      logPaymentEvent(req, "payment.initialize.success", {
        reference: referenceToLog,
        paymentMethod: normalizedMethod,
        status: "PENDING",
      });

      return res.status(200).json({
        data: {
          reference: referenceToLog,
          authorizationUrl: payload?.authorization_url || null,
          accessCode: payload?.access_code || null,
          amount: Number(amountNumber),
        },
      });
    } catch (error) {
      const message = error?.message || "Failed to initialize payment";
      metrics.increment("payments.initialize.failed", 1);
      metrics.timing("payments.initialize.latency_ms", Date.now() - startedAt, {
        outcome: "failed",
      });
      logPaymentEvent(req, "payment.initialize.failed", {
        error: message,
      });
      logger.error(`Payment initialize failed: ${message}`);
      return res.status(error?.statusCode || 500).json({ error: message });
    }
  },

  verify: async (req, res) => {
    const startedAt = Date.now();
    try {
      const reference = req.params.reference;
      if (!reference) {
        return res.status(400).json({ error: "Payment reference is required" });
      }

      const normalizedReference = String(reference).trim();
      const cached = verifyCache.get(normalizedReference);
      if (cached) {
        metrics.increment("payments.verify.cache_hit", 1);
        metrics.timing("payments.verify.latency_ms", Date.now() - startedAt, {
          cache: "hit",
        });
        return res.status(200).json({ data: cached, cached: true });
      }

      res.set({
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });

      const payment = await prisma.payment.findUnique({
        where: { reference: normalizedReference },
        select: { method: true },
      });

      let responsePayload;

      if (payment?.method === "MOBILE_MONEY" || payment?.method === "CARD") {
        const status =
          await mobileMoneyService.getPaymentStatus(normalizedReference);
        responsePayload = status;
      } else {
        const data =
          await paystackService.verifyTransaction(normalizedReference);

        responsePayload = {
          reference: normalizedReference,
          status: data?.status || "unknown",
          channel: data?.channel || null,
          amount: Number(data?.amount || 0) / 100,
          paidAt: data?.paid_at || null,
          gatewayResponse: data?.gateway_response || null,
          raw: data,
        };
      }

      const cacheTtl = isTerminalPaymentStatus(
        responsePayload?.saleStatus || responsePayload?.status,
      )
        ? 30 * 1000
        : 3 * 1000;
      verifyCache.set(normalizedReference, responsePayload, cacheTtl);

      metrics.increment("payments.verify.success", 1);
      metrics.timing("payments.verify.latency_ms", Date.now() - startedAt, {
        cache: "miss",
      });
      logPaymentEvent(req, "payment.verify.success", {
        reference: normalizedReference,
        status: responsePayload?.status || null,
        saleStatus: responsePayload?.saleStatus || null,
      });

      return res.status(200).json({ data: responsePayload });
    } catch (error) {
      const message = error?.message || "Failed to verify payment";
      metrics.increment("payments.verify.failed", 1);
      metrics.timing("payments.verify.latency_ms", Date.now() - startedAt, {
        outcome: "failed",
      });
      logger.error(`Payment verify failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  },

  submitOtp: async (req, res) => {
    const startedAt = Date.now();
    try {
      const { reference, otp } = req.body;

      if (!reference || !String(reference).trim()) {
        return res.status(400).json({ error: "Payment reference is required" });
      }

      if (!otp || !String(otp).trim()) {
        return res.status(400).json({ error: "OTP is required" });
      }

      const data = await paystackService.submitChargeOtp({ reference, otp });

      await auditService.log({
        userId: req.user?.id || null,
        action: "PAYMENT_OTP_SUBMIT",
        targetType: "Payment",
        targetId: String(reference).trim(),
        after: {
          status: data?.status || "unknown",
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      });

      metrics.increment("payments.otp.success", 1);
      metrics.timing("payments.otp.latency_ms", Date.now() - startedAt);
      logPaymentEvent(req, "payment.otp.success", {
        reference: String(reference).trim(),
        status: data?.status || "unknown",
      });

      return res.status(200).json({
        data: {
          reference,
          status: data?.status || "unknown",
          gatewayResponse: data?.gateway_response || null,
          raw: data,
        },
      });
    } catch (error) {
      const message = error?.message || "Failed to submit OTP";
      metrics.increment("payments.otp.failed", 1);
      metrics.timing("payments.otp.latency_ms", Date.now() - startedAt, {
        outcome: "failed",
      });
      logger.error(`Payment OTP submission failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  },

  cancel: async (req, res) => {
    const startedAt = Date.now();
    try {
      const { reference, reason } = req.body;

      const result = await mobileMoneyService.cancelPendingPayment({
        reference: String(reference).trim(),
        reason: reason || "Cancelled from POS terminal",
        requestedByUserId: req.user?.id,
        requestedByRole: req.user?.role,
      });

      verifyCache.del(String(reference).trim());

      await auditService.log({
        userId: req.user?.id || null,
        action: "PAYMENT_CANCEL",
        targetType: "Payment",
        targetId: String(reference).trim(),
        after: {
          status: result?.status || "FAILED",
          saleStatus: result?.saleStatus || "CANCELLED",
          reason: result?.failureReason || reason || null,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      });

      metrics.increment("payments.cancel.success", 1);
      metrics.timing("payments.cancel.latency_ms", Date.now() - startedAt);
      logPaymentEvent(req, "payment.cancel.success", {
        reference: String(reference).trim(),
        status: result?.status || null,
        saleStatus: result?.saleStatus || null,
      });

      return res.status(200).json({ data: result });
    } catch (error) {
      const message = error?.message || "Failed to cancel payment";
      metrics.increment("payments.cancel.failed", 1);
      metrics.timing("payments.cancel.latency_ms", Date.now() - startedAt, {
        outcome: "failed",
      });
      logger.error(`Payment cancel failed: ${message}`);
      return res.status(error?.statusCode || 400).json({ error: message });
    }
  },

  reconciliation: async (req, res) => {
    const startedAt = Date.now();
    try {
      const report = await paymentsReconciliationService.buildReport({
        from: req.query.from,
        to: req.query.to,
        page: req.query.page,
        pageSize: req.query.pageSize,
        status: req.query.status,
        providerStatus: req.query.providerStatus,
      });

      metrics.increment("payments.reconciliation.success", 1);
      metrics.timing(
        "payments.reconciliation.latency_ms",
        Date.now() - startedAt,
      );

      logPaymentEvent(req, "payment.reconciliation.generated", {
        filters: report.filters,
        exceptionsCount: report.pagination.total,
      });

      return res.status(200).json({ data: report });
    } catch (error) {
      const message =
        error?.message || "Failed to generate reconciliation report";
      metrics.increment("payments.reconciliation.failed", 1);
      metrics.timing(
        "payments.reconciliation.latency_ms",
        Date.now() - startedAt,
        {
          outcome: "failed",
        },
      );
      logger.error(`Payment reconciliation failed: ${message}`);
      return res.status(500).json({ error: message });
    }
  },

  webhook: async (req, res) => {
    const startedAt = Date.now();
    try {
      const rawBody =
        typeof req.rawBody === "string"
          ? req.rawBody
          : JSON.stringify(req.body || {});
      const signature = req.headers["x-paystack-signature"];

      const result = await mobileMoneyService.handleWebhook({
        rawBody,
        signature: Array.isArray(signature) ? signature[0] : signature,
        correlationId: req.correlationId,
      });

      const webhookReference =
        result?.reference ||
        req.body?.data?.reference ||
        req.body?.data?.trxref;
      if (webhookReference) {
        verifyCache.del(String(webhookReference));
      }

      await auditService.log({
        action: "PAYMENT_WEBHOOK",
        targetType: "Payment",
        targetId: webhookReference || "UNKNOWN",
        after: {
          event: req.body?.event || null,
          status: result?.status || "processed",
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      });

      metrics.increment("payments.webhook.success", 1, {
        duplicate: String(Boolean(result?.duplicate)),
      });
      metrics.timing("payments.webhook.latency_ms", Date.now() - startedAt);
      logPaymentEvent(req, "payment.webhook.processed", {
        reference: webhookReference || null,
        duplicate: Boolean(result?.duplicate),
        status: result?.status || null,
      });

      return res.status(200).json(result);
    } catch (error) {
      const message = error?.message || "Webhook processing failed";
      metrics.increment("payments.webhook.failed", 1);
      metrics.timing("payments.webhook.latency_ms", Date.now() - startedAt, {
        outcome: "failed",
      });
      logger.error(`Payment webhook failed: ${message}`);
      return res.status(error?.statusCode || 400).json({ error: message });
    }
  },
};
