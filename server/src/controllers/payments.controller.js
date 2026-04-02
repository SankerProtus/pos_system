import { paystackService } from "../services/paystack.service.js";
import { prisma } from "../lib/Prisma.js";

const defaultEmail =
  process.env.PAYSTACK_DEFAULT_CUSTOMER_EMAIL || "pos@example.com";

export const paymentsController = {
  initialize: async (req, res) => {
    try {
      const { amount, paymentMethod, customerId, customerEmail, metadata } =
        req.body;

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
};
