import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/Prisma.js";
import { paystackService } from "./paystack.service.js";
import { logger } from "../utils/logger.js";
import { metrics } from "../utils/metrics.js";
import { paymentStateMachine } from "./paymentStateMachine.service.js";

const MOMO_PROVIDER = (process.env.MOMO_PROVIDER || "PAYSTACK").toUpperCase();
const PAYMENT_TIMEOUT_MINUTES = Number(
  process.env.MOMO_PAYMENT_TIMEOUT_MINUTES || 15,
);
const DEFAULT_CUSTOMER_EMAIL =
  process.env.PAYSTACK_DEFAULT_CUSTOMER_EMAIL || "pos@example.com";
const WEBHOOK_REPLAY_WINDOW_MINUTES = Number(
  process.env.WEBHOOK_REPLAY_WINDOW_MINUTES || 10,
);

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const toCents = (value) => Math.round((Number(value) || 0) * 100);

const createBadRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const transitionPayment = ({ payment, toStatus, source, reference }) => {
  paymentStateMachine.assertTransition({
    fromStatus: payment.status,
    toStatus,
    reference,
    source,
  });
};

const normalizePhoneNumber = (phoneNumber) => {
  const raw = String(phoneNumber || "").trim();
  const normalized = raw.replace(/[\s()-]/g, "");

  if (/^\+233\d{9}$/.test(normalized)) {
    return normalized;
  }

  if (/^0\d{9}$/.test(normalized)) {
    return `+233${normalized.slice(1)}`;
  }

  throw createBadRequestError(
    "Phone must be +233XXXXXXXXX or 0XXXXXXXXX (e.g. 0540000000)",
  );
};

const resolveMomoProvider = (network, phoneNumber) => {
  const normalizedNetwork = String(network || "")
    .trim()
    .toLowerCase();
  const networkAliasMap = {
    mtn: "mtn",
    vodafone: "vodafone",
    telecel: "vodafone",
    tigo: "tigo",
    airtel: "tigo",
    airteltigo: "tigo",
    at: "tigo",
  };

  if (networkAliasMap[normalizedNetwork]) {
    return networkAliasMap[normalizedNetwork];
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const digitsOnly = normalizedPhone.replace(/^\+/, "");
  const localPhone = digitsOnly.startsWith("233")
    ? `0${digitsOnly.slice(3)}`
    : digitsOnly.startsWith("0")
      ? digitsOnly
      : /^\d{9}$/.test(digitsOnly)
        ? `0${digitsOnly}`
        : digitsOnly;

  if (/^0?(24|25|53|54|55|59)/.test(localPhone)) {
    return "mtn";
  }

  if (/^0?(20|50)/.test(localPhone)) {
    return "vodafone";
  }

  if (/^0?(26|27|28|56|57)/.test(localPhone)) {
    return "tigo";
  }

  throw createBadRequestError(
    "Unable to detect mobile money provider from phone number",
  );
};

const mapSaleForReceipt = (sale) => {
  return {
    id: sale.id,
    createdAt: sale.createdAt || null,
    subtotal: Number(sale.subtotal) || 0,
    taxAmount: Number(sale.taxAmount) || 0,
    discountAmount: Number(sale.discountAmount) || 0,
    totalAmount: Number(sale.totalAmount) || 0,
    status: sale.status,
    user: {
      id: sale.user?.id || "",
      name: sale.user?.name || "",
    },
    customer: sale.customer
      ? {
          id: sale.customer.id,
          name: sale.customer.name,
        }
      : null,
    items: Array.isArray(sale.saleItems)
      ? sale.saleItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0,
          taxRate: Number(item.taxRate) || 0,
          barcode: item.barcode || null,
          lineTotal: Number(item.subtotal) || 0,
        }))
      : [],
    payment: sale.payment
      ? {
          method: sale.payment.method || "",
          status: sale.payment.status || "PENDING",
          amount: Number(sale.payment.amount) || 0,
          amountPaid: Number(sale.payment.amountPaid) || 0,
          changeDue: Number(sale.payment.changeDue) || 0,
          reference: sale.payment.reference || null,
        }
      : null,
    receipt: sale.receipt
      ? {
          receiptNumber: sale.receipt.receiptNumber || "N/A",
          storeName: sale.receipt.storeName || "",
          storeAddress: sale.receipt.storeAddress || "",
          storeTaxId: sale.receipt.storeTaxId || "",
          cashierName: sale.receipt.cashierName || "",
          customerName: sale.receipt.customerName || null,
          createdAt: sale.receipt.createdAt || null,
        }
      : null,
  };
};

const createReceiptNumber = (saleId) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RCP-${dateStr}-${saleId.slice(-6).toUpperCase()}`;
};

const loadCanonicalSaleItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No items provided");
  }

  const { productsService } = await import("./products.service.js");

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
      const lineDiscount = Number(item.discount) || 0;
      const subtotal = toMoney(unitPrice * quantity - lineDiscount);

      return {
        productId: item.productId,
        productName: product.productName,
        unitPrice,
        quantity,
        discount: lineDiscount,
        taxRate: Number(product.taxRate) || 0,
        barcode: item.barcode || product.barcode || null,
        subtotal,
      };
    }),
  );
};

const resolveCustomerEmail = async (customerId, customerEmail) => {
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

  return DEFAULT_CUSTOMER_EMAIL;
};

const markTimedOutIfNeeded = async (reference) => {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { reference },
      include: { sale: true },
    });

    if (!payment || payment.status !== "PENDING") {
      return;
    }

    if (!payment.expiresAt || payment.expiresAt > now) {
      return;
    }

    transitionPayment({
      payment,
      toStatus: "FAILED",
      source: "timeout",
      reference,
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        providerStatus: "EXPIRED",
        failureReason: "Payment request timed out",
        processedAt: now,
      },
    });

    await tx.sale.update({
      where: { id: payment.saleId },
      data: { status: "CANCELLED" },
    });
  });
};

const hasCustomerCancellationSignal = (providerMessage, verifiedData) => {
  const messageCandidates = [
    providerMessage,
    verifiedData?.gateway_response,
    verifiedData?.message,
    verifiedData?.display_text,
  ]
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);

  const cancellationPatterns = [
    /cancel(?:led)?/,
    /declin(?:ed|e)/,
    /denied/,
    /rejected/,
    /abandon(?:ed)?/,
    /customer.*(cancel|decline|reject|deny)/,
    /(cancel|decline|reject|deny).*customer/,
    /not approved/,
    /failed by user/,
  ];

  return messageCandidates.some((message) =>
    cancellationPatterns.some((pattern) => pattern.test(message)),
  );
};

const reconcilePendingPaymentWithProvider = async (reference) => {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { sale: true },
  });

  if (!payment || payment.status !== "PENDING") {
    return;
  }

  let verifiedData;
  try {
    verifiedData = await paystackService.verifyTransaction(reference);
  } catch {
    return;
  }

  const providerStatus = String(
    verifiedData?.status || "pending",
  ).toLowerCase();
  const providerMessage =
    verifiedData?.gateway_response || verifiedData?.message || providerStatus;

  if (providerStatus === "success") {
    await prisma.$transaction(async (tx) => {
      const latestPayment = await tx.payment.findUnique({
        where: { reference },
      });

      if (!latestPayment || latestPayment.status !== "PENDING") {
        return;
      }

      const expectedAmountCents = toCents(latestPayment.amount);
      const providerAmountCents = Number(verifiedData?.amount || 0);

      if (
        Number.isFinite(providerAmountCents) &&
        providerAmountCents > 0 &&
        providerAmountCents !== expectedAmountCents
      ) {
        transitionPayment({
          payment: latestPayment,
          toStatus: "FAILED",
          source: "provider_reconcile_amount_mismatch",
          reference,
        });

        await tx.payment.update({
          where: { id: latestPayment.id },
          data: {
            status: "FAILED",
            providerStatus: "AMOUNT_MISMATCH",
            failureReason: "Provider amount does not match expected sale total",
            processedAt: new Date(),
          },
        });

        await tx.sale.update({
          where: { id: latestPayment.saleId },
          data: { status: "CANCELLED" },
        });
        return;
      }

      transitionPayment({
        payment: latestPayment,
        toStatus: "SUCCESS",
        source: "provider_reconcile_success",
        reference,
      });

      await tx.payment.update({
        where: { id: latestPayment.id },
        data: {
          status: "SUCCESS",
          amountPaid: latestPayment.amount,
          providerStatus: String(providerMessage).slice(0, 50).toUpperCase(),
          failureReason: null,
          processedAt: new Date(),
        },
      });

      await applySaleCompletion(tx, latestPayment);
    });

    return;
  }

  const failedStatuses = new Set([
    "failed",
    "abandoned",
    "reversed",
    "cancelled",
    "canceled",
  ]);
  const isCustomerCancelled = hasCustomerCancellationSignal(
    providerMessage,
    verifiedData,
  );

  if (failedStatuses.has(providerStatus) || isCustomerCancelled) {
    await prisma.$transaction(async (tx) => {
      const latestPayment = await tx.payment.findUnique({
        where: { reference },
      });

      if (!latestPayment || latestPayment.status !== "PENDING") {
        return;
      }

      transitionPayment({
        payment: latestPayment,
        toStatus: "FAILED",
        source: "provider_reconcile_failed",
        reference,
      });

      await tx.payment.update({
        where: { id: latestPayment.id },
        data: {
          status: "FAILED",
          providerStatus: String(
            failedStatuses.has(providerStatus) ? providerStatus : "cancelled",
          )
            .slice(0, 50)
            .toUpperCase(),
          failureReason: String(providerMessage || "Payment failed").slice(
            0,
            500,
          ),
          processedAt: new Date(),
        },
      });

      await tx.sale.update({
        where: { id: latestPayment.saleId },
        data: { status: "CANCELLED" },
      });
    });
    return;
  }

  await prisma.payment.update({
    where: { reference },
    data: {
      providerStatus: String(providerStatus).slice(0, 50).toUpperCase(),
    },
  });
};

const applySaleCompletion = async (tx, paymentWithSale) => {
  const saleId = paymentWithSale.saleId;

  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: {
      saleItems: true,
      user: true,
      customer: true,
      payment: true,
      receipt: true,
    },
  });

  if (!sale) {
    throw new Error("Sale not found during payment finalization");
  }

  if (sale.status === "COMPLETED") {
    return;
  }

  for (const item of sale.saleItems) {
    const inventory = await tx.inventory.findUnique({
      where: { productId: item.productId },
    });

    if (!inventory) {
      throw new Error(`Inventory not found for product: ${item.productId}`);
    }

    if (inventory.quantity < item.quantity) {
      throw new Error(`Insufficient stock for product: ${item.productName}`);
    }

    const quantityBefore = inventory.quantity;
    const quantityAfter = quantityBefore - item.quantity;

    await tx.inventory.update({
      where: { id: inventory.id },
      data: { quantity: quantityAfter },
    });

    await tx.stockAdjustment.create({
      data: {
        inventoryId: inventory.id,
        productId: item.productId,
        userId: sale.userId,
        reason: "SALE",
        quantityBefore,
        quantityChange: -item.quantity,
        quantityAfter,
        referenceId: sale.id,
      },
    });
  }

  if (sale.customerId) {
    const pointsEarned = Math.max(0, Math.floor(Number(sale.totalAmount) || 0));
    if (pointsEarned > 0) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: {
          loyaltyPoints: {
            increment: pointsEarned,
          },
        },
      });
    }
  }

  if (!sale.receipt) {
    await tx.receipt.create({
      data: {
        saleId: sale.id,
        receiptNumber: createReceiptNumber(sale.id),
        storeName: process.env.STORE_NAME || "SwiftPOS Retail",
        storeAddress: process.env.STORE_ADDRESS || "123 Main Street",
        storeTaxId: process.env.STORE_TAX_ID || "TAX-123456",
        cashierName: sale.user?.name || "",
        customerName: sale.customer?.name || null,
        items: sale.saleItems.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      },
    });
  }

  await tx.sale.update({
    where: { id: sale.id },
    data: { status: "COMPLETED" },
  });
};

const buildProviderEventId = (payload, rawBody) => {
  const eventType = String(payload?.event || "unknown");
  const transactionId = payload?.data?.id;

  if (transactionId) {
    return `${eventType}:${String(transactionId)}`;
  }

  const contentHash = crypto
    .createHash("sha256")
    .update(rawBody || "")
    .digest("hex");

  return `${eventType}:${contentHash}`;
};

const buildPayloadHash = (rawBody) => {
  return crypto
    .createHash("sha256")
    .update(String(rawBody || ""))
    .digest("hex");
};

const normalizeWebhookOutcome = (payload, verifiedData) => {
  const eventType = String(payload?.event || "").toLowerCase();
  const payloadStatus = String(payload?.data?.status || "").toLowerCase();
  const verifiedStatus = String(verifiedData?.status || "").toLowerCase();

  if (verifiedStatus === "success") {
    return "SUCCESS";
  }

  if (eventType === "charge.success" || payloadStatus === "success") {
    return "SUCCESS";
  }

  return "FAILED";
};

const validatePaystackSignature = (rawBody, signature) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  if (!signature) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
};

export const mobileMoneyService = {
  mapSaleForReceipt,

  initiatePayment: async ({
    items,
    phoneNumber,
    network,
    customerId,
    customerEmail,
    discountAmount,
    userId,
    notes,
  }) => {
    if (!userId) {
      throw new Error("Unauthorized: User ID missing");
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
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

    const providerReference = `MOMO-${crypto.randomUUID()}`;
    const expiresAt = new Date(
      Date.now() + PAYMENT_TIMEOUT_MINUTES * 60 * 1000,
    );
    const resolvedProvider = resolveMomoProvider(network, normalizedPhone);

    const sale = await prisma.$transaction(async (tx) => {
      for (const item of saleItems) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory) {
          throw new Error(`Inventory not found for product: ${item.productId}`);
        }

        if (inventory.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product: ${item.productName}`,
          );
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
              method: "MOBILE_MONEY",
              status: "PENDING",
              amount: totalAmount,
              amountPaid: 0,
              changeDue: 0,
              reference: providerReference,
              phoneNumber: normalizedPhone,
              provider: MOMO_PROVIDER,
              providerStatus: "INITIATED",
              expiresAt,
            },
          },
        },
        include: {
          payment: true,
        },
      });
    });

    const email = await resolveCustomerEmail(customerId, customerEmail);

    try {
      const providerPayload = await paystackService.chargeMobileMoney({
        email,
        amount: totalAmount,
        phoneNumber: normalizedPhone,
        provider: resolvedProvider,
        reference: providerReference,
        metadata: {
          source: "POS",
          saleId: sale.id,
          paymentId: sale.payment?.id || null,
          initiatedByUserId: userId,
        },
      });

      const providerStatus = String(providerPayload?.status || "pending")
        .slice(0, 50)
        .toUpperCase();

      if (["FAILED", "ABANDONED", "REVERSED"].includes(providerStatus)) {
        throw new Error(
          providerPayload?.gateway_response ||
            providerPayload?.display_text ||
            "Provider could not send payment prompt",
        );
      }

      await prisma.payment.update({
        where: { reference: providerReference },
        data: {
          providerStatus,
          provider: providerPayload?.momoProvider
            ? `PAYSTACK_${String(providerPayload.momoProvider).toUpperCase()}`
            : `PAYSTACK_${resolvedProvider.toUpperCase()}`,
        },
      });

      return {
        saleId: sale.id,
        paymentId: sale.payment?.id || null,
        reference: providerReference,
        status: "PENDING",
        saleStatus: "PENDING",
        phoneNumber: normalizedPhone,
        amount: totalAmount,
        expiresAt,
        provider: providerPayload?.momoProvider
          ? `PAYSTACK_${String(providerPayload.momoProvider).toUpperCase()}`
          : `PAYSTACK_${resolvedProvider.toUpperCase()}`,
        providerStatus,
        providerMessage:
          providerPayload?.display_text ||
          providerPayload?.gateway_response ||
          "Payment prompt sent. Waiting for customer approval.",
        authorizationUrl: providerPayload?.authorization_url || null,
      };
    } catch (error) {
      const message = error?.message || "Failed to initialize provider payment";
      const lowered = message.toLowerCase();
      const isKeyIssue =
        lowered.includes("invalid key") ||
        lowered.includes("authorization") ||
        lowered.includes("not configured");

      const finalMessage = isKeyIssue
        ? "Payment provider authorization failed. Update PAYSTACK_SECRET_KEY with a valid active key for your Paystack account."
        : message;

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { reference: providerReference },
          data: {
            status: "FAILED",
            providerStatus: "INIT_FAILED",
            failureReason: finalMessage,
            processedAt: new Date(),
          },
        });

        await tx.sale.update({
          where: { id: sale.id },
          data: { status: "CANCELLED" },
        });
      });

      const err = new Error(finalMessage);
      err.statusCode = error?.statusCode || (isKeyIssue ? 502 : 400);
      throw err;
    }
  },

  getPaymentStatus: async (reference) => {
    if (!reference || !String(reference).trim()) {
      throw new Error("Payment reference is required");
    }

    const normalizedReference = String(reference).trim();
    await markTimedOutIfNeeded(normalizedReference);
    await reconcilePendingPaymentWithProvider(normalizedReference);

    const payment = await prisma.payment.findUnique({
      where: { reference: normalizedReference },
      include: {
        sale: {
          include: {
            user: true,
            customer: true,
            saleItems: true,
            payment: true,
            receipt: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    return {
      reference: payment.reference,
      status: payment.status,
      saleStatus: payment.sale?.status || "PENDING",
      amount: Number(payment.amount) || 0,
      phoneNumber: payment.phoneNumber || null,
      provider: payment.provider || MOMO_PROVIDER,
      providerStatus: payment.providerStatus || null,
      failureReason: payment.failureReason || null,
      expiresAt: payment.expiresAt || null,
      createdAt: payment.createdAt,
      sale:
        payment.sale?.status === "COMPLETED"
          ? mapSaleForReceipt(payment.sale)
          : null,
    };
  },

  reconcilePaymentByReference: async (
    reference,
    { source = "service" } = {},
  ) => {
    if (!reference || !String(reference).trim()) {
      return;
    }

    const normalizedReference = String(reference).trim();
    await markTimedOutIfNeeded(normalizedReference);
    await reconcilePendingPaymentWithProvider(normalizedReference);
    metrics.increment("payments.reconcile.reference", 1, {
      source,
    });
  },

  cancelPendingPayment: async ({
    reference,
    requestedByUserId,
    requestedByRole,
    reason,
  }) => {
    if (!reference || !String(reference).trim()) {
      const error = new Error("Payment reference is required");
      error.statusCode = 400;
      throw error;
    }

    if (!requestedByUserId) {
      const error = new Error("Unauthorized: user context is missing");
      error.statusCode = 401;
      throw error;
    }

    const normalizedReference = String(reference).trim();
    await markTimedOutIfNeeded(normalizedReference);
    await reconcilePendingPaymentWithProvider(normalizedReference);

    const payment = await prisma.payment.findUnique({
      where: { reference: normalizedReference },
      include: {
        sale: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      const error = new Error("Payment not found");
      error.statusCode = 404;
      throw error;
    }

    if (payment.method !== "MOBILE_MONEY") {
      const error = new Error("Only mobile money payments can be cancelled");
      error.statusCode = 400;
      throw error;
    }

    const elevatedRoles = new Set(["ADMIN", "MANAGER"]);
    const canCancel =
      elevatedRoles.has(String(requestedByRole || "").toUpperCase()) ||
      payment.sale?.userId === requestedByUserId;

    if (!canCancel) {
      const error = new Error(
        "You are not allowed to cancel this payment request",
      );
      error.statusCode = 403;
      throw error;
    }

    if (payment.status !== "PENDING") {
      return {
        reference: payment.reference,
        status: payment.status,
        saleStatus: payment.sale?.status || "PENDING",
        providerStatus: payment.providerStatus || null,
        failureReason: payment.failureReason || null,
      };
    }

    const finalReason = String(reason || "Payment cancelled from POS terminal")
      .trim()
      .slice(0, 500);

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const latest = await tx.payment.findUnique({
        where: { reference: normalizedReference },
        include: {
          sale: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!latest) {
        const error = new Error("Payment not found");
        error.statusCode = 404;
        throw error;
      }

      if (latest.status !== "PENDING") {
        return latest;
      }

      transitionPayment({
        payment: latest,
        toStatus: "FAILED",
        source: "cancel",
        reference: normalizedReference,
      });

      await tx.payment.update({
        where: { id: latest.id },
        data: {
          status: "FAILED",
          providerStatus: "CANCELLED_BY_POS",
          failureReason: finalReason,
          processedAt: now,
        },
      });

      if (latest.sale?.status === "PENDING") {
        await tx.sale.update({
          where: { id: latest.sale.id },
          data: { status: "CANCELLED" },
        });
      }

      return tx.payment.findUnique({
        where: { id: latest.id },
        include: {
          sale: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });
    });

    return {
      reference: updated.reference,
      status: updated.status,
      saleStatus: updated.sale?.status || "PENDING",
      providerStatus: updated.providerStatus || null,
      failureReason: updated.failureReason || finalReason,
      cancelledAt: now,
    };
  },

  handleWebhook: async ({ rawBody, signature, correlationId = null }) => {
    const signatureValid = validatePaystackSignature(rawBody, signature);
    if (!signatureValid) {
      const error = new Error("Invalid webhook signature");
      error.statusCode = 401;
      throw error;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      const error = new Error("Invalid webhook JSON payload");
      error.statusCode = 400;
      throw error;
    }

    const reference = String(payload?.data?.reference || "").trim();
    if (!reference) {
      return {
        accepted: true,
        duplicate: false,
        message: "Webhook received without reference",
      };
    }

    const eventType = String(payload?.event || "unknown");
    const providerEventId = buildProviderEventId(payload, rawBody);
    const payloadHash = buildPayloadHash(rawBody);

    const replayWindowStart = new Date(
      Date.now() - WEBHOOK_REPLAY_WINDOW_MINUTES * 60 * 1000,
    );
    const replayHit = await prisma.paymentWebhookEvent.findFirst({
      where: {
        reference,
        eventType,
        payloadHash,
        receivedAt: {
          gte: replayWindowStart,
        },
      },
      select: { id: true },
    });

    if (replayHit) {
      metrics.increment("payments.webhook.replay_ignored", 1);
      logger.warn(
        JSON.stringify({
          event: "payment.webhook.replay_ignored",
          correlationId,
          reference,
          eventType,
        }),
      );
      return {
        accepted: true,
        duplicate: true,
        message: "Replay webhook ignored",
      };
    }

    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          providerEventId,
          reference,
          eventType,
          status: String(payload?.data?.status || "").toUpperCase() || null,
          signature,
          payloadHash,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return {
          accepted: true,
          duplicate: true,
          message: "Duplicate webhook ignored",
        };
      }
      throw error;
    }

    let verifiedData = null;
    try {
      verifiedData = await paystackService.verifyTransaction(reference);
    } catch {
      verifiedData = null;
    }

    const outcome = normalizeWebhookOutcome(payload, verifiedData);

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { reference },
          include: {
            sale: {
              include: {
                user: true,
                customer: true,
                saleItems: true,
                payment: true,
                receipt: true,
              },
            },
          },
        });

        if (!payment) {
          await tx.paymentWebhookEvent.update({
            where: { providerEventId },
            data: {
              status: "IGNORED_PAYMENT_NOT_FOUND",
              processedAt: new Date(),
            },
          });

          return {
            accepted: true,
            duplicate: false,
            status: "IGNORED_PAYMENT_NOT_FOUND",
          };
        }

        if (payment.status === "SUCCESS" || payment.status === "FAILED") {
          await tx.paymentWebhookEvent.update({
            where: { providerEventId },
            data: {
              paymentId: payment.id,
              status: `IGNORED_ALREADY_${payment.status}`,
              processedAt: new Date(),
            },
          });

          return {
            accepted: true,
            duplicate: false,
            status: payment.status,
          };
        }

        if (outcome === "SUCCESS") {
          transitionPayment({
            payment,
            toStatus: "SUCCESS",
            source: "webhook",
            reference,
          });

          const expectedAmountCents = toCents(payment.amount);
          const verifiedAmountCents = Number(verifiedData?.amount || 0);
          const payloadAmountCents = Number(payload?.data?.amount || 0);
          const providerAmountCents =
            verifiedAmountCents > 0 ? verifiedAmountCents : payloadAmountCents;

          if (
            Number.isFinite(providerAmountCents) &&
            expectedAmountCents !== providerAmountCents
          ) {
            transitionPayment({
              payment,
              toStatus: "FAILED",
              source: "webhook_amount_mismatch",
              reference,
            });

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: "FAILED",
                providerStatus: "AMOUNT_MISMATCH",
                failureReason:
                  "Provider amount does not match expected sale total",
                processedAt: new Date(),
              },
            });

            await tx.sale.update({
              where: { id: payment.saleId },
              data: { status: "CANCELLED" },
            });

            await tx.paymentWebhookEvent.update({
              where: { providerEventId },
              data: {
                paymentId: payment.id,
                status: "FAILED_AMOUNT_MISMATCH",
                processedAt: new Date(),
              },
            });

            return {
              accepted: true,
              duplicate: false,
              status: "FAILED",
            };
          }

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "SUCCESS",
              amountPaid: payment.amount,
              providerStatus: String(
                verifiedData?.gateway_response ||
                  payload?.data?.status ||
                  "success",
              )
                .slice(0, 50)
                .toUpperCase(),
              failureReason: null,
              processedAt: new Date(),
            },
          });

          await applySaleCompletion(tx, payment);

          await tx.paymentWebhookEvent.update({
            where: { providerEventId },
            data: {
              paymentId: payment.id,
              status: "SUCCESS",
              processedAt: new Date(),
            },
          });

          return {
            accepted: true,
            duplicate: false,
            status: "SUCCESS",
          };
        }

        transitionPayment({
          payment,
          toStatus: "FAILED",
          source: "webhook_failed",
          reference,
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            providerStatus: String(payload?.data?.status || "failed")
              .slice(0, 50)
              .toUpperCase(),
            failureReason:
              payload?.data?.gateway_response ||
              payload?.data?.message ||
              "Customer declined or payment failed",
            processedAt: new Date(),
          },
        });

        await tx.sale.update({
          where: { id: payment.saleId },
          data: { status: "CANCELLED" },
        });

        await tx.paymentWebhookEvent.update({
          where: { providerEventId },
          data: {
            paymentId: payment.id,
            status: "FAILED",
            processedAt: new Date(),
          },
        });

        return {
          accepted: true,
          duplicate: false,
          status: "FAILED",
        };
      });
    } catch (error) {
      await prisma.paymentWebhookEvent.update({
        where: { providerEventId },
        data: {
          status: "FAILED_PROCESSING",
          errorReason: String(
            error?.message || "Webhook processing failed",
          ).slice(0, 1000),
          processedAt: new Date(),
        },
      });
      throw error;
    }

    return result;
  },
};
