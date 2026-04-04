import { salesService } from "../services/sales.service.js";
import { logger } from "../utils/logger.js";
import { auditService } from "../services/audit.service.js";

export const salesController = {
  getSales: async (req, res) => {
    try {
      const limit = req.query?.limit;
      const status = req.query?.status;
      const from = req.query?.from;
      const to = req.query?.to;

      if (from && Number.isNaN(Date.parse(from))) {
        return res.status(400).json({ error: "Invalid from date" });
      }

      if (to && Number.isNaN(Date.parse(to))) {
        return res.status(400).json({ error: "Invalid to date" });
      }

      if (from && to && new Date(from) > new Date(to)) {
        return res
          .status(400)
          .json({ error: "from date must be less than or equal to to date" });
      }

      const sales = await salesService.getSales({ limit, status, from, to });
      res.status(200).json({ data: sales });
    } catch (error) {
      logger.error(`Error fetching sales: ${error?.message || error}`);
      res
        .status(500)
        .json({ error: "Internal server error, " + error.message });
    }
  },
  createSale: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: User ID missing" });
      }
      logger.info(
        `[sales.createSale] request paymentMethod=${req.body?.paymentMethod || "UNKNOWN"} itemCount=${Array.isArray(req.body?.items) ? req.body.items.length : 0}`,
      );
      const saleData = { ...req.body, userId };
      const newSale = await salesService.createSale(saleData);
      logger.info(
        `[sales.createSale] sale created saleId=${newSale.id} totalAmount=${newSale.totalAmount} status=${newSale.status}`,
      );

      // Map backend sale object to exact frontend Receipt shape
      const mappedSale = {
        id: newSale.id,
        createdAt: newSale.createdAt || null,
        subtotal: Number(newSale.subtotal) || 0,
        taxAmount: Number(newSale.taxAmount) || 0,
        discountAmount: Number(newSale.discountAmount) || 0,
        totalAmount: Number(newSale.totalAmount) || 0,
        status: newSale.status,
        user: {
          id: newSale.user?.id || "",
          name: newSale.user?.name || "",
        },
        customer: newSale.customer
          ? {
              id: newSale.customer.id,
              name: newSale.customer.name,
            }
          : null,
        items: Array.isArray(newSale.saleItems)
          ? newSale.saleItems.map((item) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              quantity: Number(item.quantity) || 0,
              unitPrice: Number(item.unitPrice) || 0,
              discount: Number(item.discount) || 0,
              taxRate: Number(item.taxRate) || 0,
              barcode: item.barcode || null,
              lineTotal:
                typeof item.subtotal === "number"
                  ? Number(item.subtotal)
                  : Number(item.unitPrice || 0) * Number(item.quantity || 0) -
                    Number(item.discount || 0),
            }))
          : [],
        payment: newSale.payment
          ? {
              method: newSale.payment.method || "",
              amountPaid: Number(newSale.payment.amountPaid) || 0,
              changeDue: Number(newSale.payment.changeDue) || 0,
              reference: newSale.payment.reference || null,
            }
          : {
              method: "",
              amountPaid: 0,
              changeDue: 0,
              reference: null,
            },
        receipt: newSale.receipt
          ? {
              receiptNumber: newSale.receipt.receiptNumber || "N/A",
              storeName: newSale.receipt.storeName || "",
              storeAddress: newSale.receipt.storeAddress || "",
              storeTaxId: newSale.receipt.storeTaxId || "",
              cashierName: newSale.receipt.cashierName || "",
              customerName: newSale.receipt.customerName || null,
              createdAt: newSale.receipt.createdAt || null,
            }
          : {
              receiptNumber: newSale.payment?.reference || newSale.id || "N/A",
              storeName: "",
              storeAddress: "",
              storeTaxId: "",
              cashierName: "",
              customerName: null,
              createdAt: null,
            },
      };
      await auditService.log({
        userId,
        action: "SALE_CREATE",
        targetType: "Sale",
        targetId: newSale.id,
        after: {
          status: newSale.status,
          totalAmount: Number(newSale.totalAmount) || 0,
          paymentMethod: newSale.payment?.method || null,
          paymentReference: newSale.payment?.reference || null,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      });

      res.status(201).json({ data: mappedSale });
    } catch (error) {
      logger.error(`Error creating sale: ${error?.message || error}`);
      const message = error?.message || error?.cause?.message || "";
      if (
        message.includes("Insufficient stock") ||
        message.includes("Inventory not found") ||
        message.includes("No items provided") ||
        message.includes("Payment") ||
        message.includes("Amount") ||
        message.includes("Card") ||
        message.includes("Mobile money") ||
        message.includes("Paystack")
      ) {
        return res.status(400).json({ error: message });
      }
      res.status(500).json({ error: "Internal server error, " + message });
    }
  },
  voidSale: async (req, res) => {
    try {
      const saleId = req.params.id;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: User ID missing" });
      }
      const voidedSale = await salesService.voidSale(saleId, userId);

      await auditService.log({
        userId,
        action: "SALE_VOID",
        targetType: "Sale",
        targetId: saleId,
        after: {
          status: voidedSale?.status || "VOIDED",
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      });

      res.status(200).json({ data: voidedSale });
    } catch (error) {
      logger.error(`Error voiding sale: ${error?.message || error}`);
      res
        .status(500)
        .json({ error: "Internal server error, " + error.message });
    }
  },
};
