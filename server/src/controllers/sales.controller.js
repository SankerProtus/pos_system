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
            res.status(500).json({ error: "Internal server error, " + error.message });
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
           res.status(201).json({ data: newSale });
        } catch (error) {
            console.error("Error creating sale:", error);
            res.status(500).json({ error: "Internal server error, " + error.message });
        }
    },
    voidSale: async (req, res) => {
        try {
            const saleId = req.params.id;
            const voidedSale = await salesService.voidSale(saleId);
            res.status(200).json({ data: voidedSale });
        } catch (error) {
            console.error("Error voiding sale:", error);
            res.status(500).json({ error: "Internal server error, " + error.message });
        }
    }
};