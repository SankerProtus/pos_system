import { salesRepository } from "../repositories/sales.repository.js";

export const salesService = {
    getSales: async (data) => {
        try {
            const limit = data?.limit;
            const status = data?.status;
            const sales = await salesRepository.getAllSales({ limit, status });
            return sales;
        } catch (error) {
            console.error("Error fetching sales:", error);
            throw new Error("Internal server error", { cause: error });
        }
    },
    createSale: async (saleData) => {
        try {
            const newSale = await salesRepository.createSale(saleData);
            return newSale;
        } catch (error) {
            console.error("Error creating sale:", error);
            throw new Error("Internal server error", { cause: error });
        }
    }
};
