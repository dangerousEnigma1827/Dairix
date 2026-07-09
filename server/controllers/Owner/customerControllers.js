import User from "../../models/userModels.js";
import ApiError from "../../utils/apiError.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

// Create Customer
export const createCustomer = asyncHandler(async (req, res) => {
    const {
        name,
        mobile,
        address,
        assignedDM,
        products,
        qrCode,
    } = req.body;

    if (!name || !mobile || mobile.length !== 10) {
        throw new ApiError(400, "Invalid customer details");
    }

    const existingCustomer = await User.findOne({ mobile });

    if (existingCustomer) {
        throw new ApiError(400, "Customer already exists");
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

    return res.status(201).json(
        new ApiResponse(
            201,
            customer,
            "Customer created successfully"
        )
    );
});

// Get All Customers
export const getAllCustomers = asyncHandler(async (req, res) => {
    const customers = await User.find({ role: "customer" })
        .populate("assignedDM", "name mobile")
        .sort({ createdAt: -1 })
        .select("-password");

    return res.status(200).json(
        new ApiResponse(
            200,
            customers,
            "Customers fetched successfully"
        )
    );
});

// Get Single Customer
export const getCustomerById = asyncHandler(async (req, res) => {
    const customer = await User.findOne({
        _id: req.params.id,
        role: "customer",
    })
        .populate("assignedDM", "name mobile")
        .select("-password");

    if (!customer) {
        throw new ApiError(404, "Customer not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            customer,
            "Customer fetched successfully"
        )
    );
});

// Update Customer
export const updateCustomer = asyncHandler(async (req, res) => {
    const {
        name,
        mobile,
        address,
        assignedDM,
        products,
        qrCode,
    } = req.body;

    const customer = await User.findOneAndUpdate(
        {
            _id: req.params.id,
            role: "customer",
        },
        {
            name,
            mobile,
            address,
            assignedDM,
            products,
            qrCode,
        },
        {
            new: true,
            runValidators: true,
        }
    )
        .populate("assignedDM", "name mobile")
        .select("-password");

    if (!customer) {
        throw new ApiError(404, "Customer not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            customer,
            "Customer updated successfully"
        )
    );
});

// Delete Customer
export const deleteCustomer = asyncHandler(async (req, res) => {
    const customer = await User.findOneAndDelete({
        _id: req.params.id,
        role: "customer",
    });

    if (!customer) {
        throw new ApiError(404, "Customer not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Customer deleted successfully"
        )
    );
});

// Assign / Change Delivery Staff
export const assignDeliveryStaff = asyncHandler(async (req, res) => {
    const { deliveryManId } = req.body;

    const customer = await User.findOne({
        _id: req.params.id,
        role: "customer",
    });

    if (!customer) {
        throw new ApiError(404, "Customer not found");
    }

    customer.assignedDM = deliveryManId;
    await customer.save();

    await customer.populate("assignedDM", "name mobile");

    return res.status(200).json(
        new ApiResponse(
            200,
            customer,
            "Delivery staff assigned successfully"
        )
    );
});