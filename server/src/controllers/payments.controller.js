import { paystackService } from "../services/paystack.service.js";
import { mobileMoneyService } from "../services/mobileMoney.service.js";
import { prisma } from "../lib/Prisma.js";

const defaultEmail =
  process.env.PAYSTACK_DEFAULT_CUSTOMER_EMAIL || "pos@example.com";

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
        return res
          .status(400)
          .json({
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
            error: "Customer phone number is required for mobile money payments",
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

      return res.status(200).json({
        data: {
          reference: payload?.reference || reference,
          authorizationUrl: payload?.authorization_url || null,
          accessCode: payload?.access_code || null,
        },
      });
    } catch (error) {
      const message = error?.message || "Failed to initialize payment";
      return res.status(500).json({ error: message });
    }
  },

  verify: async (req, res) => {
    try {
      const reference = req.params.reference;
      if (!reference) {
        return res.status(400).json({ error: "Payment reference is required" });
      }

      const payment = await prisma.payment.findUnique({
        where: { reference },
        select: { method: true },
      });

      if (payment?.method === "MOBILE_MONEY") {
        const status = await mobileMoneyService.getPaymentStatus(reference);

        return res.status(200).json({ data: status });
      }

      const data = await paystackService.verifyTransaction(reference);

      return res.status(200).json({
        data: {
          reference,
          status: data?.status || "unknown",
          channel: data?.channel || null,
          amount: Number(data?.amount || 0) / 100,
          paidAt: data?.paid_at || null,
          gatewayResponse: data?.gateway_response || null,
          raw: data,
        },
      });
    } catch (error) {
      const message = error?.message || "Failed to verify payment";
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

      return res.status(200).json(result);
    } catch (error) {
      const message = error?.message || "Webhook processing failed";
      return res.status(error?.statusCode || 400).json({ error: message });
    }
  },
};
