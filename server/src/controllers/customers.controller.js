import { customersService } from "../services/customers.service.js";
import { logger } from "../utils/logger.js";

export const customersController = {
  getAllCustomers: async (req, res) => {
    try {
      const customers = await customersService.getAllCustomers();
      res.status(200).json({ data: customers });
    } catch (error) {
      logger.error("Error fetching customers: ", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  },

  getCustomerById: async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await customersService.getCustomerById(id);
        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }
      res.status(200).json({ data: customer });
    } catch (error) {
      logger.error("Error fetching customer: ", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  },

  createCustomer: async (req, res) => {
    try {
      const customerData = req.body;
      if(customerData.dateOfBirth) {
        customerData.dateOfBirth = new Date(customerData.dateOfBirth);
      }
      const newCustomer = await customersService.createCustomer(customerData);
      res.status(201).json({ data: newCustomer });
    } catch (error) {
      logger.error("Error creating customer: ", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  },

  updateCustomer: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      if(updateData.dateOfBirth) {
        updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      }
      const updatedCustomer = await customersService.updateCustomer(
        id,
        updateData,
      );
      if (!updatedCustomer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(200).json({ data: updatedCustomer });
    } catch (error) {
      logger.error("Error updating customer: ", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  },

  deleteCustomer: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedCustomer = await customersService.deleteCustomer(id);
      if (!deletedCustomer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(200).json({ data: { message: "Customer deleted successfully" }});
    } catch (error) {
      logger.error("Error deleting customer: ", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  },
};
