import { salesService } from "../services/sales.services.js";

export const salesController = {
    getSales: async (req, res) => {
        try {
            const limit = req.query?.limit;
            const status = req.query?.status;
            const sales = await salesService.getSales({ limit, status });
            res.status(200).json(sales);
        } catch (error) {
            console.error("Error fetching sales:", error);
            res.status(500).json({ error: "Internal server error, " + error.message });
        }
    },
    createSale: async (req, res) => {
        try {
           const saleData = req.body;
           const newSale = await salesService.createSale(saleData);
           res.status(201).json(newSale);
        } catch (error) {
            console.error("Error creating sale:", error);
            res.status(500).json({ error: "Internal server error, " + error.message });
        }
    }
};