import express from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  assignDeliveryStaff,
} from "../../controllers/Owner/customerControllers.js";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";

const router = express.Router();

// All routes here require owner role
router.use(authenticate, requireRole("owner"));

// Create customer
router.post("/", createCustomer);

// Get all customers
router.get("/", getAllCustomers);

// Get single customer
router.get("/:id", getCustomerById);

// Update customer
router.put("/:id", updateCustomer);

// Delete customer
router.delete("/:id", deleteCustomer);

// Assign / Change Delivery Staff
router.post("/:customerId/assign-dm", assignDeliveryStaff);

export default router;