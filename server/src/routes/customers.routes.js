import express from 'express';
import { customersController } from "../controllers/customers.controller.js";

const router = express.Router();

// Get all customers
router.get('/', customersController.getAllCustomers);

// Get a customer by ID
router.get('/:id', customersController.getCustomerById);

// Create a new customer
router.post('/', customersController.createCustomer);

// Update a customer
router.put('/:id', customersController.updateCustomer);

// Delete a customer
router.delete('/:id', customersController.deleteCustomer);

export { router as customersRouter };

