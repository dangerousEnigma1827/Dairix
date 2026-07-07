import express from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  assignDeliveryStaff,
} from "../../controllers/Owner/customerControllers.js";
import authMiddleware from "../../middlewares/authMiddlewares.js";

const router = express.Router();

// Create customer
router.post("/", authMiddleware, createCustomer);

// Get all customers
router.get("/", authMiddleware, getAllCustomers);

// Get single customer
router.get("/:id", authMiddleware, getCustomerById);

// Update customer
router.put("/:id", authMiddleware, updateCustomer);

// Delete customer
router.delete("/:id", authMiddleware, deleteCustomer);

// Assign / Change Delivery Staff
router.patch("/:id/assign-dm", authMiddleware, assignDeliveryStaff);

export default router;