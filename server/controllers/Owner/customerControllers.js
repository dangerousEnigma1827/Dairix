import User from "../models/User.js";

// Create Customer
export const createCustomer = async (req, res) => {
    try {
        const {
            name,
            mobile,
            address,
            assignedDM,
            products,
            qrCode,
        } = req.body;

        const existingCustomer = await User.findOne({ mobile });

        if (existingCustomer) {
            return res.status(400).json({
                success: false,
                message: "Customer already exists.",
            });
        }

        const customer = await User.create({
            name,
            mobile,
            role: "customer",
            address,
            assignedDM: assignedDM || null,
            products: products || [],
            qrCode: qrCode || "",
        });

        return res.status(201).json({
            success: true,
            message: "Customer created successfully.",
            customer,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get All Customers
export const getAllCustomers = async (req, res) => {
    try {
        const customers = await User.find({ role: "customer" })
            .populate("assignedDM", "name mobile")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            customers,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get Single Customer
export const getCustomerById = async (req, res) => {
    try {
        const customer = await User.findOne({
            _id: req.params.id,
            role: "customer",
        }).populate("assignedDM", "name mobile");

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found.",
            });
        }

        return res.status(200).json({
            success: true,
            customer,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update Customer
export const updateCustomer = async (req, res) => {
    try {
        const customer = await User.findOneAndUpdate(
            {
                _id: req.params.id,
                role: "customer",
            },
            req.body,
            {
                new: true,
                runValidators: true,
            }
        ).populate("assignedDM", "name mobile");

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Customer updated successfully.",
            customer,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete Customer
export const deleteCustomer = async (req, res) => {
    try {
        const customer = await User.findOneAndDelete({
            _id: req.params.id,
            role: "customer",
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Customer deleted successfully.",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Assign / Change Delivery Staff
export const assignDeliveryStaff = async (req, res) => {
    try {
        const { deliveryManId } = req.body;

        const customer = await User.findOne({
            _id: req.params.id,
            role: "customer",
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found.",
            });
        }

        customer.assignedDM = deliveryManId;
        await customer.save();

        await customer.populate("assignedDM", "name mobile");

        return res.status(200).json({
            success: true,
            message: "Delivery staff assigned successfully.",
            customer,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};