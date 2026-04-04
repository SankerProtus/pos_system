import { paystackService } from "../services/paystack.service.js";
import { mobileMoneyService } from "../services/mobileMoney.service.js";
import { prisma } from "../lib/Prisma.js";
import { logger } from "../utils/logger.js";
import { createTtlCache } from "../lib/ttlCache.js";
import { auditService } from "../services/audit.service.js";

const defaultEmail =
  process.env.PAYSTACK_DEFAULT_CUSTOMER_EMAIL || "pos@example.com";
const verifyCache = createTtlCache({
  defaultTtlMs: 3 * 1000,
  maxEntries: 1000,
});

const isTerminalPaymentStatus = (value) => {
  const status = String(value || "").toUpperCase();
  return ["SUCCESS", "FAILED", "CANCELLED", "CANCELED", "COMPLETED"].includes(
    status,
  );
};

export const paymentsController = {
  initialize: async (req, res) => {
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

      return res.status(200).json({
        data: {
          reference: referenceToLog,
          authorizationUrl: payload?.authorization_url || null,
          accessCode: payload?.access_code || null,
        },
      });
    } catch (error) {
      const message = error?.message || "Failed to initialize payment";
      logger.error(`Payment initialize failed: ${message}`);
      return res.status(error?.statusCode || 500).json({ error: message });
    }
  },

  verify: async (req, res) => {
    try {
      const reference = req.params.reference;
      if (!reference) {
        return res.status(400).json({ error: "Payment reference is required" });
      }

      const normalizedReference = String(reference).trim();
      const cached = verifyCache.get(normalizedReference);
      if (cached) {
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

      if (payment?.method === "MOBILE_MONEY") {
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

      return res.status(200).json({ data: responsePayload });
    } catch (error) {
      const message = error?.message || "Failed to verify payment";
      logger.error(`Payment verify failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  },

  submitOtp: async (req, res) => {
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
      logger.error(`Payment OTP submission failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  },

  webhook: async (req, res) => {
    try {
      const rawBody =
        typeof req.rawBody === "string"
          ? req.rawBody
          : JSON.stringify(req.body || {});
      const signature = req.headers["x-paystack-signature"];

      const result = await mobileMoneyService.handleWebhook({
        rawBody,
        signature: Array.isArray(signature) ? signature[0] : signature,
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

      return res.status(200).json(result);
    } catch (error) {
      const message = error?.message || "Webhook processing failed";
      logger.error(`Payment webhook failed: ${message}`);
      return res.status(error?.statusCode || 400).json({ error: message });
    }
  },
};
