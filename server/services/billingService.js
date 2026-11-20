import mongoose from "mongoose";
import DeliveryEntry from "../models/deliveryEntryModels.js";
import Payment from "../models/paymentModels.js";
import { getKolkataDateString, TIMEZONE, TIMEZONE_OFFSET_STR } from "../utils/deliveryDay.js";

/**
 * Billing rules for Dairix
 *
 * - Only "delivered" entries are billed. Pending and skipped stops cost nothing.
 * - Line amount = quantity × unit price. The unit price is the snapshot stored on the
 *   delivery entry at dispatch time; older entries fall back to the product's current price.
 * - A delivery belongs to the IST day of `date` (or `createdAt` when `date` is missing).
 * - Payments with status "void" are ignored everywhere.
 * - Balance = charges − payments. Positive means the customer owes money; negative is advance credit.
 */

const toObjectId = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)));

export const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Resolve the IST month window. Defaults to the current IST month.
 * @returns {{ month:number, year:number, start:Date, end:Date, label:string }}
 */
export const resolveBillingMonth = (monthInput, yearInput) => {
    const [curYear, curMonth] = getKolkataDateString().split("-").map(Number);

    const month = monthInput === undefined || monthInput === "" ? curMonth : Number(monthInput);
    const year = yearInput === undefined || yearInput === "" ? curYear : Number(yearInput);

    if (!Number.isInteger(month) || month < 1 || month > 12) return null;
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;

    const pad = (n) => String(n).padStart(2, "0");
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    const start = new Date(`${year}-${pad(month)}-01T00:00:00.000${TIMEZONE_OFFSET_STR}`);
    const end = new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00.000${TIMEZONE_OFFSET_STR}`);
    const label = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: TIMEZONE }).format(start);

    return { month, year, start, end, label };
};

/** $match fragment restricting delivery entries to an effective-date window. */
const entryDateMatch = ({ from, to } = {}) => {
    if (!from && !to) return {};
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lt = to;
    return { $expr: { $and: Object.entries(range).map(([op, v]) => ({ [op]: [{ $ifNull: ["$date", "$createdAt"] }, v] })) } };
};

const paymentDateMatch = ({ from, to } = {}) => {
    if (!from && !to) return {};
    const paidAt = {};
    if (from) paidAt.$gte = from;
    if (to) paidAt.$lt = to;
    return { paidAt };
};

/**
 * Sum delivered charges per customer.
 * @param {Array} customerIds
 * @param {{from?:Date,to?:Date}} window
 * @returns {Promise<Map<string,{amount:number,deliveries:number}>>}
 */
export const aggregateCharges = async (customerIds, window = {}) => {
    if (!customerIds.length) return new Map();

    const rows = await DeliveryEntry.aggregate([
        {
            $match: {
                customer: { $in: customerIds.map(toObjectId) },
                status: "delivered",
                ...entryDateMatch(window),
            },
        },
        { $unwind: "$products" },
        {
            $lookup: {
                from: "products",
                localField: "products.product",
                foreignField: "_id",
                as: "productDoc",
            },
        },
        {
            $project: {
                customer: 1,
                entryId: "$_id",
                amount: {
                    $multiply: [
                        { $ifNull: ["$products.quantity", 0] },
                        { $ifNull: ["$products.price", { $ifNull: [{ $arrayElemAt: ["$productDoc.price", 0] }, 0] }] },
                    ],
                },
            },
        },
        {
            $group: {
                _id: "$customer",
                amount: { $sum: "$amount" },
                entries: { $addToSet: "$entryId" },
            },
        },
        { $project: { amount: 1, deliveries: { $size: "$entries" } } },
    ]);

    return new Map(rows.map((r) => [r._id.toString(), { amount: roundMoney(r.amount), deliveries: r.deliveries }]));
};

/**
 * Sum non-void payments per customer.
 * @returns {Promise<Map<string,{amount:number,count:number,lastPaidAt:Date|null}>>}
 */
export const aggregatePayments = async (customerIds, window = {}) => {
    if (!customerIds.length) return new Map();

    const rows = await Payment.aggregate([
        {
            $match: {
                customer: { $in: customerIds.map(toObjectId) },
                status: { $ne: "void" },
                ...paymentDateMatch(window),
            },
        },
        {
            $group: {
                _id: "$customer",
                amount: { $sum: "$amount" },
                count: { $sum: 1 },
                lastPaidAt: { $max: "$paidAt" },
            },
        },
    ]);

    return new Map(rows.map((r) => [r._id.toString(), { amount: roundMoney(r.amount), count: r.count, lastPaidAt: r.lastPaidAt }]));
};

/**
 * Outstanding balance (all time, as of now) per customer.
 * @returns {Promise<Map<string,{charges:number,paid:number,outstanding:number,lastPaidAt:Date|null}>>}
 */
export const getOutstandingBalances = async (customerIds) => {
    const [charges, payments] = await Promise.all([aggregateCharges(customerIds), aggregatePayments(customerIds)]);
    const out = new Map();
    for (const id of customerIds.map(String)) {
        const c = charges.get(id)?.amount ?? 0;
        const p = payments.get(id)?.amount ?? 0;
        out.set(id, {
            charges: c,
            paid: p,
            outstanding: roundMoney(c - p),
            lastPaidAt: payments.get(id)?.lastPaidAt ?? null,
        });
    }
    return out;
};

/**
 * Full monthly statement for one customer.
 */
export const buildCustomerStatement = async (customer, period) => {
    const customerId = customer._id.toString();
    const ids = [customerId];

    const [chargesBefore, paymentsBefore, entries, payments, outstandingMap] = await Promise.all([
        aggregateCharges(ids, { to: period.start }),
        aggregatePayments(ids, { to: period.start }),
        DeliveryEntry.find({
            customer: customerId,
            ...entryDateMatch({ from: period.start, to: period.end }),
        })
            .populate("products.product", "name unit price")
            .populate("dm", "name")
            .lean(),
        Payment.find({
            customer: customerId,
            status: { $ne: "void" },
            paidAt: { $gte: period.start, $lt: period.end },
        })
            .populate("collectedBy", "name role")
            .sort({ paidAt: 1 })
            .lean(),
        getOutstandingBalances(ids),
    ]);

    const openingBalance = roundMoney((chargesBefore.get(customerId)?.amount ?? 0) - (paymentsBefore.get(customerId)?.amount ?? 0));

    const sortedEntries = entries
        .map((e) => ({ ...e, effectiveDate: e.date || e.createdAt }))
        .sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

    let delivered = 0;
    let skipped = 0;
    let pending = 0;
    let monthCharges = 0;

    const items = sortedEntries.map((e) => {
        if (e.status === "delivered") delivered++;
        else if (e.status === "skipped") skipped++;
        else pending++;

        const products = (e.products || []).map((p) => {
            const price = typeof p.price === "number" ? p.price : p.product?.price ?? 0;
            const billable = e.status === "delivered";
            return {
                name: p.product?.name || "Product",
                unit: p.product?.unit || "",
                quantity: p.quantity,
                price,
                amount: billable ? roundMoney(p.quantity * price) : 0,
            };
        });

        const amount = roundMoney(products.reduce((s, p) => s + p.amount, 0));
        monthCharges += amount;

        return {
            entryId: e._id,
            date: getKolkataDateString(e.effectiveDate),
            status: e.status,
            deliveredAt: e.deliveredAt || null,
            dm: e.dm ? { _id: e.dm._id, name: e.dm.name } : null,
            products,
            amount,
        };
    });

    monthCharges = roundMoney(monthCharges);
    const monthPayments = roundMoney(payments.reduce((s, p) => s + p.amount, 0));
    const closingBalance = roundMoney(openingBalance + monthCharges - monthPayments);

    return {
        customer: {
            _id: customer._id,
            name: customer.name,
            mobile: customer.mobile,
            address: customer.address || null,
        },
        period: {
            month: period.month,
            year: period.year,
            label: period.label,
            start: period.start,
            end: period.end,
        },
        summary: {
            openingBalance,
            charges: monthCharges,
            payments: monthPayments,
            closingBalance,
            outstanding: outstandingMap.get(customerId)?.outstanding ?? 0,
            delivered,
            skipped,
            pending,
        },
        items,
        payments: payments.map(serializePayment),
    };
};

export const serializePayment = (p) => ({
    _id: p._id,
    customer:
        p.customer && typeof p.customer === "object" && p.customer.name
            ? { _id: p.customer._id, name: p.customer.name, mobile: p.customer.mobile }
            : p.customer,
    collectedBy:
        p.collectedBy && typeof p.collectedBy === "object" && p.collectedBy.name
            ? { _id: p.collectedBy._id, name: p.collectedBy.name, role: p.collectedBy.role }
            : p.collectedBy,
    collectedByRole: p.collectedByRole,
    amount: p.amount,
    method: p.method,
    note: p.note,
    paidAt: p.paidAt,
    status: p.status,
    settledAt: p.settledAt || null,
});

/**
 * Validate a payment request body. Returns { amount, method, note, paidAt } or throws a message string.
 */
export const parsePaymentInput = (body = {}) => {
    const amount = roundMoney(body.amount);
    if (!Number.isFinite(Number(body.amount)) || amount <= 0) {
        return { error: "Amount must be a positive number" };
    }
    if (amount > 1_000_000) {
        return { error: "Amount is too large" };
    }

    const method = String(body.method || "").toLowerCase();
    if (!["cash", "upi"].includes(method)) {
        return { error: "Payment method must be 'cash' or 'upi'" };
    }

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";

    let paidAt = new Date();
    if (body.paidAt !== undefined && body.paidAt !== null && body.paidAt !== "") {
        paidAt = new Date(body.paidAt);
        if (Number.isNaN(paidAt.getTime())) return { error: "Invalid payment date" };
        if (paidAt.getTime() > Date.now() + 5 * 60 * 1000) return { error: "Payment date cannot be in the future" };
    }

    return { amount, method, note, paidAt };
};
