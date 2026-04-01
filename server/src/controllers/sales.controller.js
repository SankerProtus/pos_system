import { salesService } from "../services/sales.service.js";

export const salesController = {
  getSales: async (req, res) => {
    try {
      const limit = req.query?.limit;
      const status = req.query?.status;
      const sales = await salesService.getSales({ limit, status });
      res.status(200).json({ data: sales });
    } catch (error) {
      console.error("Error fetching sales:", error);
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
      const saleData = { ...req.body, userId };
      const newSale = await salesService.createSale(saleData);

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
              provider: newSale.payment.provider || null,
              last4: newSale.payment.last4 || null,
            }
          : {
              method: "",
              amountPaid: 0,
              changeDue: 0,
              reference: null,
              provider: null,
              last4: null,
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
              receiptNumber: "N/A",
              storeName: "",
              storeAddress: "",
              storeTaxId: "",
              cashierName: "",
              customerName: null,
              createdAt: null,
            },
      };
      res.status(201).json({ data: mappedSale });
    } catch (error) {
        console.error("Error creating sale:", error);
        const message = error?.message || error?.cause?.message || "";
        if (
          message.includes("Insufficient stock") ||
          message.includes("Inventory not found")
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
      res.status(200).json({ data: voidedSale });
    } catch (error) {
      console.error("Error voiding sale:", error);
      res
        .status(500)
        .json({ error: "Internal server error, " + error.message });
    }
  },
};
