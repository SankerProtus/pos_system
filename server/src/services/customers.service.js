import { customersRepository } from "../repositories/customers.repository.js";

export const customersService = {
  getAllCustomers: async () => {
    return await customersRepository.getAll();
  },
  searchCustomers: async (search) => {
    if (!search) {
      throw new Error("Search query is required");
    }
    return await customersRepository.searchCustomers(search);
  },
  getCustomerById: async (id) => {
    if (!id) {
      throw new Error("Customer ID is required");
    }
    return await customersRepository.getById(id);
  },
  getCustomerSales: async (id) => {
    if (!id) {
      throw new Error("Customer ID is required");
    }

    return await customersRepository.getCustomerSales(id);
  },
  createCustomer: async (data) => {
    return await customersRepository.create(data);
  },
  updateCustomer: async (id, data) => {
    return await customersRepository.update(id, data);
  },
  deleteCustomer: async (id) => {
    return await customersRepository.delete(id);
  }
};