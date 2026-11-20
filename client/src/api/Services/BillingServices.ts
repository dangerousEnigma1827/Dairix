import api from "../api";

export type PaymentMethod = "cash" | "upi";
export type PaymentStatus = "collected" | "settled" | "void";

export interface Payment {
  _id: string;
  customer: string | { _id: string; name: string; mobile?: string };
  collectedBy: string | { _id: string; name: string; role?: string };
  collectedByRole: "dm" | "owner";
  amount: number;
  method: PaymentMethod;
  note?: string;
  paidAt: string;
  status: PaymentStatus;
  settledAt?: string | null;
}

export interface Balance {
  charges: number;
  paid: number;
  outstanding: number;
  lastPaidAt: string | null;
}

export interface StatementItem {
  entryId: string;
  date: string;
  status: "delivered" | "skipped" | "pending";
  deliveredAt: string | null;
  dm: { _id: string; name: string } | null;
  products: { name: string; unit: string; quantity: number; price: number; amount: number }[];
  amount: number;
}

export interface Statement {
  customer: { _id: string; name: string; mobile: string };
  period: { month: number; year: number; label: string };
  summary: {
    openingBalance: number;
    charges: number;
    payments: number;
    closingBalance: number;
    outstanding: number;
    delivered: number;
    skipped: number;
    pending: number;
  };
  items: StatementItem[];
  payments: Payment[];
}

export interface PaymentInput {
  customerId: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}

type Period = { month: number; year: number };

// ── Customer ────────────────────────────────────────────────
export const getMyStatement = async (p: Period): Promise<Statement> =>
  (await api.get("/billing/customer/statement", { params: p })).data.data;

export const getMyPayments = async (): Promise<{ balance: Balance; payments: Payment[] }> =>
  (await api.get("/billing/customer/payments")).data.data;

// ── Delivery partner ────────────────────────────────────────
export interface DmBillingCustomer extends Balance {
  _id: string;
  name: string;
  mobile: string;
  address?: { houseNo?: string; street?: string; city?: string } | null;
}

export interface MoneyTotals { cash: number; upi: number; total: number; count: number }

export interface DmCollections {
  date: string;
  totals: MoneyTotals;
  pendingHandover: MoneyTotals;
  payments: Payment[];
}

export const getDmBillingCustomers = async (): Promise<{ totalOutstanding: number; customers: DmBillingCustomer[] }> =>
  (await api.get("/billing/dm/customers")).data.data;

export const getDmCollections = async (date?: string): Promise<DmCollections> =>
  (await api.get("/billing/dm/collections", { params: date ? { date } : {} })).data.data;

export const getDmCustomerStatement = async (customerId: string, p: Period): Promise<Statement> =>
  (await api.get(`/billing/dm/customers/${customerId}/statement`, { params: p })).data.data;

export const recordDmPayment = async (input: PaymentInput): Promise<{ payment: Payment; balance: Balance }> =>
  (await api.post("/billing/dm/payments", input)).data.data;

// ── Owner ───────────────────────────────────────────────────
export interface OwnerBillingRow {
  _id: string;
  name: string;
  mobile: string;
  assignedDm: { _id: string; name: string } | null;
  deliveries: number;
  charges: number;
  paid: number;
  outstanding: number;
  lastPaidAt: string | null;
}

export interface OwnerOverview {
  period: { month: number; year: number; label: string };
  totals: {
    billed: number;
    collected: number;
    outstanding: number;
    advance: number;
    withDms: number;
    customersWithDues: number;
  };
  customers: OwnerBillingRow[];
}

export interface PendingDmGroup {
  dm: { _id: string; name: string; mobile?: string } | null;
  cash: number;
  upi: number;
  total: number;
  payments: Payment[];
}

export const getOwnerOverview = async (p: Period): Promise<OwnerOverview> =>
  (await api.get("/billing/owner/overview", { params: p })).data.data;

export const getOwnerCustomerStatement = async (customerId: string, p: Period): Promise<Statement> =>
  (await api.get(`/billing/owner/customers/${customerId}/statement`, { params: p })).data.data;

export const recordOwnerPayment = async (input: PaymentInput): Promise<{ payment: Payment; balance: Balance }> =>
  (await api.post("/billing/owner/payments", input)).data.data;

export const voidPayment = async (paymentId: string, reason?: string): Promise<Payment> =>
  (await api.patch(`/billing/owner/payments/${paymentId}/void`, { reason })).data.data;

export const getOwnerPendingCollections = async (): Promise<{ total: number; dms: PendingDmGroup[] }> =>
  (await api.get("/billing/owner/collections")).data.data;

export const settleDmCollections = async (dmId: string): Promise<{ settledCount: number; settledAmount: number }> =>
  (await api.post("/billing/owner/collections/settle", { dmId })).data.data;

// ── Helpers ─────────────────────────────────────────────────
export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

export const currentPeriod = (): Period => {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()).split("-").map(Number);
  return { month: m, year: y };
};

export const shiftPeriod = ({ month, year }: Period, delta: number): Period => {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
};

export const apiErrorMessage = (err: unknown, fallback = "Something went wrong") => {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || fallback;
};
