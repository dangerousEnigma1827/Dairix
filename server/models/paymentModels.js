import mongoose from "mongoose";

/**
 * A payment received from a customer against their delivery bill.
 *
 * Lifecycle:
 * - "collected": recorded by a delivery partner at the doorstep; money is still with the DM.
 * - "settled":   handed over to / received by the owner. Owner-recorded payments start here.
 * - "void":      cancelled by the owner (wrong entry). Ignored in every balance.
 */
const paymentSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        collectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        collectedByRole: {
            type: String,
            enum: ["dm", "owner"],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },

        method: {
            type: String,
            enum: ["cash", "upi"],
            required: true,
        },

        note: {
            type: String,
            trim: true,
            default: "",
            maxlength: 300,
        },

        paidAt: {
            type: Date,
            default: Date.now,
            index: true,
        },

        status: {
            type: String,
            enum: ["collected", "settled", "void"],
            default: "collected",
            index: true,
        },

        settledAt: {
            type: Date,
            default: null,
        },

        settledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        voidedAt: {
            type: Date,
            default: null,
        },

        voidReason: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Payment", paymentSchema);
