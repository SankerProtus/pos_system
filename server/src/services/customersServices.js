import { customersRepository } from "../repositories/customers.repository.js";

export const customersService = {
  getAllCustomers: async () => {
    return await customersRepository.getAll();
  },
  getCustomerById: async (id) => {
    const customer = await customersRepository.getById(id);

    if (!customer) {
      throw new Error("Customer not found");
    }

    return customer;
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