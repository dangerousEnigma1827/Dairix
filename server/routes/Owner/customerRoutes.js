import express from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  assignDeliveryStaff,
} from "../../controllers/Owner/customerControllers.js";
import {authenticate} from "../../middlewares/authMiddlewares.js";

const router = express.Router();

// Create customer
router.post("/", authenticate, createCustomer);

// Get all customers
router.get("/", authenticate, getAllCustomers);

// Get single customer
router.get("/:id", authenticate, getCustomerById);

// Update customer
router.put("/:id", authenticate, updateCustomer);

// Delete customer
router.delete("/:id", authenticate, deleteCustomer);

// Assign / Change Delivery Staff
router.post("/:customerId/assign-dm", authenticate, assignDeliveryStaff);

export default router;