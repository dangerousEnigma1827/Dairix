import mongoose from "mongoose";
import User from "../models/userModels.js";
import Payment from "../models/paymentModels.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getDeliveryDayRange } from "../utils/deliveryDay.js";
import {
    aggregateCharges,
    aggregatePayments,
    buildCustomerStatement,
    getOutstandingBalances,
    parsePaymentInput,
    resolveBillingMonth,
    roundMoney,
    serializePayment,
} from "../services/billingService.js";

// ── Shared helpers ──────────────────────────────────────────────────────────

const getOwnerBusinessId = (user) => user.businessId || user._id;

/** Customers an owner may see: their business, plus legacy unscoped customers (matches existing owner views). */
const ownerCustomerFilter = (bizId) => ({
    role: "customer",
    $or: [{ businessId: bizId }, { businessId: null }],
});

const requirePeriod = (query) => {
    const period = resolveBillingMonth(query.month, query.year);
    if (!period) throw new ApiError(400, "Invalid month or year");
    return period;
};

const requireObjectId = (id, label) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
};

const findOwnerCustomer = async (bizId, customerId) => {
    requireObjectId(customerId, "customer id");
    const customer = await User.findOne({ _id: customerId, ...ownerCustomerFilter(bizId) })
        .populate("assignedDm", "name mobile")
        .select("-password");
    if (!customer) throw new ApiError(404, "Customer not found");
    return customer;
};

const sumBy = (list, pred) => roundMoney(list.filter(pred).reduce((s, p) => s + p.amount, 0));

// ── Customer ────────────────────────────────────────────────────────────────

/** GET /api/billing/customer/statement?month=&year= */
export const getMyStatement = asyncHandler(async (req, res) => {
    const period = requirePeriod(req.query);
    const statement = await buildCustomerStatement(req.user, period);
    return res.status(200).json(new ApiResponse(200, statement, "Statement fetched"));
});

/** GET /api/billing/customer/payments */
export const getMyPayments = asyncHandler(async (req, res) => {
    const payments = await Payment.find({ customer: req.user._id, status: { $ne: "void" } })
        .populate("collectedBy", "name role")
        .sort({ paidAt: -1 })
        .limit(100)
        .lean();

    const balance = (await getOutstandingBalances([req.user._id])).get(req.user._id.toString());

    return res.status(200).json(
        new ApiResponse(200, { balance, payments: payments.map(serializePayment) }, "Payments fetched")
    );
});

// ── Delivery partner (DM) ───────────────────────────────────────────────────

/** GET /api/billing/dm/customers — assigned customers with their outstanding balance. */
export const getDmBillingCustomers = asyncHandler(async (req, res) => {
    const customers = await User.find({ role: "customer", assignedDm: req.user._id })
        .select("name mobile address")
        .sort({ name: 1 })
        .lean();

    const balances = await getOutstandingBalances(customers.map((c) => c._id));

    const data = customers.map((c) => ({
        _id: c._id,
        name: c.name,
        mobile: c.mobile,
        address: c.address || null,
        ...balances.get(c._id.toString()),
    }));

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalOutstanding: roundMoney(data.reduce((s, c) => s + Math.max(c.outstanding, 0), 0)),
                customers: data,
            },
            "Customers fetched"
        )
    );
});

/** GET /api/billing/dm/collections?date=YYYY-MM-DD — what this DM collected that day + cash still to hand over. */
export const getDmCollections = asyncHandler(async (req, res) => {
    const rawDate = req.query.date;
    if (rawDate && (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(new Date(`${rawDate}T12:00:00+05:30`).getTime()))) {
        throw new ApiError(400, "date must be YYYY-MM-DD");
    }
    const { startOfDay, endOfDay, dateString } = getDeliveryDayRange(
        rawDate ? new Date(`${rawDate}T12:00:00+05:30`) : undefined
    );

    const [dayPayments, unsettled] = await Promise.all([
        Payment.find({
            collectedBy: req.user._id,
            status: { $ne: "void" },
            paidAt: { $gte: startOfDay, $lte: endOfDay },
        })
            .populate("customer", "name mobile")
            .sort({ paidAt: -1 })
            .lean(),
        Payment.find({ collectedBy: req.user._id, status: "collected" }).select("amount method").lean(),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                date: dateString,
                totals: {
                    cash: sumBy(dayPayments, (p) => p.method === "cash"),
                    upi: sumBy(dayPayments, (p) => p.method === "upi"),
                    total: sumBy(dayPayments, () => true),
                    count: dayPayments.length,
                },
                pendingHandover: {
                    cash: sumBy(unsettled, (p) => p.method === "cash"),
                    upi: sumBy(unsettled, (p) => p.method === "upi"),
                    total: sumBy(unsettled, () => true),
                    count: unsettled.length,
                },
                payments: dayPayments.map(serializePayment),
            },
            "Collections fetched"
        )
    );
});

/** GET /api/billing/dm/customers/:customerId/statement — statement for an assigned customer (to show at the door). */
export const getDmCustomerStatement = asyncHandler(async (req, res) => {
    requireObjectId(req.params.customerId, "customer id");
    const customer = await User.findOne({ _id: req.params.customerId, role: "customer", assignedDm: req.user._id }).select(
        "-password"
    );
    if (!customer) throw new ApiError(403, "This customer is not assigned to you");

    const statement = await buildCustomerStatement(customer, requirePeriod(req.query));
    return res.status(200).json(new ApiResponse(200, statement, "Statement fetched"));
});

/** POST /api/billing/dm/payments { customerId, amount, method, note } */
export const recordDmPayment = asyncHandler(async (req, res) => {
    const { customerId } = req.body || {};
    requireObjectId(customerId, "customer id");

    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) throw new ApiError(404, "Customer not found");
    if (!customer.assignedDm || customer.assignedDm.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only collect payments from customers assigned to you");
    }

    const input = parsePaymentInput(req.body);
    if (input.error) throw new ApiError(400, input.error);

    const payment = await Payment.create({
        businessId: customer.businessId || req.user.businessId || null,
        customer: customer._id,
        collectedBy: req.user._id,
        collectedByRole: "dm",
        amount: input.amount,
        method: input.method,
        note: input.note,
        paidAt: input.paidAt,
        status: "collected",
    });

    const balance = (await getOutstandingBalances([customer._id])).get(customer._id.toString());

    return res.status(201).json(new ApiResponse(201, { payment: serializePayment(payment), balance }, "Payment recorded"));
});

// ── Owner ───────────────────────────────────────────────────────────────────

/** GET /api/billing/owner/overview?month=&year= — business-wide billing for a month, per customer. */
export const getOwnerBillingOverview = asyncHandler(async (req, res) => {
    const period = requirePeriod(req.query);
    const bizId = getOwnerBusinessId(req.user);

    const customers = await User.find(ownerCustomerFilter(bizId))
        .select("name mobile assignedDm")
        .populate("assignedDm", "name")
        .sort({ name: 1 })
        .lean();
    const ids = customers.map((c) => c._id);

    const window = { from: period.start, to: period.end };
    const [monthCharges, monthPayments, balances, unsettled] = await Promise.all([
        aggregateCharges(ids, window),
        aggregatePayments(ids, window),
        getOutstandingBalances(ids),
        Payment.find({ customer: { $in: ids }, status: "collected" }).select("amount").lean(),
    ]);

    const rows = customers.map((c) => {
        const id = c._id.toString();
        const bal = balances.get(id);
        return {
            _id: c._id,
            name: c.name,
            mobile: c.mobile,
            assignedDm: c.assignedDm ? { _id: c.assignedDm._id, name: c.assignedDm.name } : null,
            deliveries: monthCharges.get(id)?.deliveries ?? 0,
            charges: monthCharges.get(id)?.amount ?? 0,
            paid: monthPayments.get(id)?.amount ?? 0,
            outstanding: bal?.outstanding ?? 0,
            lastPaidAt: bal?.lastPaidAt ?? null,
        };
    });

    const totals = {
        billed: roundMoney(rows.reduce((s, r) => s + r.charges, 0)),
        collected: roundMoney(rows.reduce((s, r) => s + r.paid, 0)),
        outstanding: roundMoney(rows.reduce((s, r) => s + Math.max(r.outstanding, 0), 0)),
        advance: roundMoney(rows.reduce((s, r) => s + Math.max(-r.outstanding, 0), 0)),
        withDms: sumBy(unsettled, () => true),
        customersWithDues: rows.filter((r) => r.outstanding > 0).length,
    };

    return res.status(200).json(
        new ApiResponse(
            200,
            { period: { month: period.month, year: period.year, label: period.label }, totals, customers: rows },
            "Billing overview fetched"
        )
    );
});

/** GET /api/billing/owner/customers/:customerId/statement?month=&year= */
export const getOwnerCustomerStatement = asyncHandler(async (req, res) => {
    const bizId = getOwnerBusinessId(req.user);
    const customer = await findOwnerCustomer(bizId, req.params.customerId);
    const statement = await buildCustomerStatement(customer, requirePeriod(req.query));
    return res.status(200).json(new ApiResponse(200, statement, "Statement fetched"));
});

/** POST /api/billing/owner/payments { customerId, amount, method, note, paidAt } — owner receives payment directly. */
export const recordOwnerPayment = asyncHandler(async (req, res) => {
    const bizId = getOwnerBusinessId(req.user);
    const customer = await findOwnerCustomer(bizId, req.body?.customerId);

    const input = parsePaymentInput(req.body);
    if (input.error) throw new ApiError(400, input.error);

    const now = new Date();
    const payment = await Payment.create({
        businessId: customer.businessId || bizId,
        customer: customer._id,
        collectedBy: req.user._id,
        collectedByRole: "owner",
        amount: input.amount,
        method: input.method,
        note: input.note,
        paidAt: input.paidAt,
        status: "settled",
        settledAt: now,
        settledBy: req.user._id,
    });

    const balance = (await getOutstandingBalances([customer._id])).get(customer._id.toString());

    return res.status(201).json(new ApiResponse(201, { payment: serializePayment(payment), balance }, "Payment recorded"));
});

/** GET /api/billing/owner/collections — money collected by DMs but not yet handed over, grouped by DM. */
export const getOwnerPendingCollections = asyncHandler(async (req, res) => {
    const bizId = getOwnerBusinessId(req.user);
    const customerIds = (await User.find(ownerCustomerFilter(bizId)).select("_id").lean()).map((c) => c._id);

    const payments = await Payment.find({ customer: { $in: customerIds }, status: "collected" })
        .populate("customer", "name mobile")
        .populate("collectedBy", "name mobile role")
        .sort({ paidAt: -1 })
        .lean();

    const groups = new Map();
    for (const p of payments) {
        const dmId = p.collectedBy?._id?.toString() || "unknown";
        if (!groups.has(dmId)) {
            groups.set(dmId, {
                dm: p.collectedBy ? { _id: p.collectedBy._id, name: p.collectedBy.name, mobile: p.collectedBy.mobile } : null,
                cash: 0,
                upi: 0,
                total: 0,
                payments: [],
            });
        }
        const g = groups.get(dmId);
        g[p.method] = roundMoney(g[p.method] + p.amount);
        g.total = roundMoney(g.total + p.amount);
        g.payments.push(serializePayment(p));
    }

    const data = Array.from(groups.values()).sort((a, b) => b.total - a.total);

    return res.status(200).json(
        new ApiResponse(
            200,
            { total: roundMoney(data.reduce((s, g) => s + g.total, 0)), dms: data },
            "Pending collections fetched"
        )
    );
});

/** POST /api/billing/owner/collections/settle { dmId, paymentIds? } — mark a DM's collections as handed over. */
export const settleDmCollections = asyncHandler(async (req, res) => {
    const bizId = getOwnerBusinessId(req.user);
    const { dmId, paymentIds } = req.body || {};
    requireObjectId(dmId, "delivery partner id");

    const dm = await User.findOne({ _id: dmId, role: "dm", $or: [{ businessId: bizId }, { businessId: null }] }).select("_id");
    if (!dm) throw new ApiError(404, "Delivery partner not found");

    const customerIds = (await User.find(ownerCustomerFilter(bizId)).select("_id").lean()).map((c) => c._id);

    const filter = { collectedBy: dm._id, customer: { $in: customerIds }, status: "collected" };
    if (paymentIds !== undefined) {
        if (!Array.isArray(paymentIds) || !paymentIds.length || !paymentIds.every((id) => mongoose.isValidObjectId(id))) {
            throw new ApiError(400, "paymentIds must be a non-empty list of ids");
        }
        filter._id = { $in: paymentIds };
    }

    const toSettle = await Payment.find(filter).select("amount").lean();
    const result = await Payment.updateMany(filter, {
        $set: { status: "settled", settledAt: new Date(), settledBy: req.user._id },
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            { settledCount: result.modifiedCount, settledAmount: sumBy(toSettle, () => true) },
            "Collections settled"
        )
    );
});

/** PATCH /api/billing/owner/payments/:paymentId/void { reason } */
export const voidPayment = asyncHandler(async (req, res) => {
    const bizId = getOwnerBusinessId(req.user);
    requireObjectId(req.params.paymentId, "payment id");

    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) throw new ApiError(404, "Payment not found");

    // Authorize via the customer's business
    await findOwnerCustomer(bizId, payment.customer);

    if (payment.status === "void") throw new ApiError(400, "Payment is already void");

    payment.status = "void";
    payment.voidedAt = new Date();
    payment.voidReason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
    await payment.save();

    return res.status(200).json(new ApiResponse(200, serializePayment(payment), "Payment voided"));
});
