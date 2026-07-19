import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Search,
  X,
  Phone,
  MapPin,
  Loader2,
  Users,
  ChevronDown,
  StickyNote,
  PackageSearch,
} from "lucide-react";

// utils
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";
import { getDmCustomersService } from "../../api/Services/Dm/DeliveryEntryServices";

// api
// NOTE: add this service in api/Services/Owner/CustomerServices.ts (or wherever your DM
// services live) — it should hit an endpoint that returns every User with role "customer"
// whose assignedDm matches the logged-in DM.

// ── Types — align with your User model ─────────────────────────────────────

type Address = {
  houseNo?: string;
  street?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
};

type CustomerProduct = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  quantity: number;
};

type Customer = {
  _id: string;
  name: string;
  mobile: string;
  address: Address;
  deliveryNotes?: string;
  products: CustomerProduct[];
  qrCode?: string;
};

function formatAddress(address?: Address) {
  if (!address) return "No address on file";
  const parts = [address.houseNo, address.street, address.landmark, address.city, address.pincode]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No address on file";
}

export default function CustomerList() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const req = await getDmCustomersService();
      setCustomers(req);
      console.log(req)
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Couldn't load your customer list. Pull down to try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        formatAddress(c.address).toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-slate-900 text-sm">My Customers</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* ── Search ── */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, or area"
              className="w-full bg-white ring-1 ring-slate-100 shadow-sm rounded-2xl pl-10 pr-9 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-blue-300"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* ── Summary strip ── */}
          <div className="bg-blue-600 rounded-2xl p-4 flex items-center gap-3 text-white">
            <div className="bg-white/15 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{customers.length}</p>
              <p className="text-xs text-blue-200 mt-1">Customers assigned to you</p>
            </div>
          </div>

          {/* ── Loading state ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 size={24} className="text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Loading customers…</p>
            </div>
          )}

          {/* ── Error state ── */}
          {!loading && error && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <button
                onClick={fetchCustomers}
                className="mt-3 text-xs font-semibold text-blue-600 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && !error && filtered.length === 0 && (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-8 flex flex-col items-center text-center gap-2">
              <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center">
                <Users size={22} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-800 text-sm">No customers found</p>
              <p className="text-xs text-slate-500">Try a different search term.</p>
            </div>
          )}

          {/* ── Customer list ── */}
          {!loading && !error && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((customer, idx) => {
                const isExpanded = expandedId === customer._id;
                return (
                  <div
                    key={customer._id}
                    className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : customer._id)}
                      className="w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                    >
                      <div
                        className={`${avatarPalette[idx % avatarPalette.length]} rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold shrink-0`}
                      >
                        {getInitials(customer.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {customer.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                          <MapPin size={11} className="shrink-0" />
                          {formatAddress(customer.address)}
                        </p>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-slate-300 shrink-0 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-50">
                        {/* Contact row */}
                        <a
                          href={`tel:${customer.mobile}`}
                          className="flex items-center gap-2 text-sm text-blue-600 font-medium pt-3"
                        >
                          <Phone size={14} />
                          {customer.mobile}
                        </a>

                        {/* Subscribed products */}
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                            <PackageSearch size={12} />
                            Daily Subscription
                          </p>
                          {customer.products.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {customer.products.map((p) => (
                                <span
                                  key={p._id}
                                  className="text-xs font-medium text-slate-700 bg-slate-50 ring-1 ring-slate-100 px-2.5 py-1 rounded-full"
                                >
                                  {p.quantity} {p.unit} · {p.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">No products assigned</p>
                          )}
                        </div>

                        {/* Delivery notes */}
                        {customer.deliveryNotes && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                              <StickyNote size={12} />
                              Delivery Notes
                            </p>
                            <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                              {customer.deliveryNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}