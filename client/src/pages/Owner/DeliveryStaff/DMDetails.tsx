import { useEffect, useState } from "react";
import {
    ArrowLeft,
    MapPin,
    Phone,
    Search,
    Users,
    UserPlus,
    Milk,
    Sunrise,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

type Customer = {
    _id: string;
    name: string;
    mobile: string;
    address?: {
        city?: string;
        street?: string;
    };
};

type DM = {
    _id: string;
    name: string;
    mobile: string;
};

const getInitials = (name: string) =>
    name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

// Loads the two display faces used on this page: Fraunces (a warm, characterful
// serif for names/headlines) and JetBrains Mono (for phone numbers and figures,
// so they read like entries in a route ledger).
function usePageFonts() {
    useEffect(() => {
        const id = "dm-details-fonts";
        if (document.getElementById(id)) return;
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href =
            "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap";
        document.head.appendChild(link);
    }, []);
}

function DMDetails() {
    usePageFonts();

    const navigate = useNavigate();
    const { dmId } = useParams();

    const [dm, setDm] = useState<DM | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState("");

    const handleGetData = async () => {
        try {
            // replace with API
            setDm({
                _id: dmId || "",
                name: "Aman Sharma",
                mobile: "9876543210",
            });

            setCustomers([
                {
                    _id: "1",
                    name: "Rahul Sharma",
                    mobile: "9999999999",
                    address: {
                        city: "Hyderabad",
                        street: "Main Road",
                    },
                },
                {
                    _id: "2",
                    name: "Amit Kumar",
                    mobile: "8888888888",
                    address: {
                        city: "Delhi",
                        street: "Park Street",
                    },
                },
            ]);
        } catch (err) {
            console.log("error loading dm details", err);
        }
    };

    useEffect(() => {
        handleGetData();
    }, []);

    const filteredCustomers = customers.filter(
        (customer) =>
            customer.name.toLowerCase().includes(search.toLowerCase()) ||
            customer.mobile.includes(search)
    );

    return (
        <div
            className="min-h-screen bg-[#F6F4EF]"
            style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
        >
            {/* Dawn hero band */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#131F38] via-[#1B2A4C] to-[#243B66] pb-20 pt-6">
                {/* sunrise glow */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#E3A23C] opacity-20 blur-3xl" />
                <div className="pointer-events-none absolute left-1/3 top-10 h-40 w-40 rounded-full bg-[#6E9FC6] opacity-10 blur-3xl" />

                <div className="relative mx-auto max-w-6xl px-6 md:px-8">
                    {/* Top nav */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="rounded-full bg-white/10 p-2 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#E3A23C]">
                            <Sunrise size={13} />
                            Morning Route
                        </div>
                    </div>

                    {/* Profile */}
                    {dm && (
                        <div className="mt-8 flex flex-wrap items-center gap-5">
                            <div
                                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-[#E3A23C] ring-2 ring-[#E3A23C]/40"
                                style={{ fontFamily: "'Fraunces', serif" }}
                            >
                                {getInitials(dm.name)}
                            </div>

                            <div>
                                <h1
                                    className="text-3xl italic text-white md:text-4xl"
                                    style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                                >
                                    {dm.name}
                                </h1>

                                <p
                                    className="mt-1.5 flex items-center gap-2 text-sm text-white/60"
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                    <Phone size={13} />
                                    {dm.mobile}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="mx-auto -mt-12 max-w-6xl space-y-8 px-6 pb-16 md:px-8">
                {/* Stats — overlapping the hero for depth */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_8px_30px_-12px_rgba(27,42,76,0.25)] ring-1 ring-slate-100">
                        <div className="rounded-xl bg-[#1B2A4C]/5 p-3 text-[#1B2A4C]">
                            <Users size={20} />
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">Customers on route</p>
                            <p
                                className="text-2xl font-semibold text-slate-900"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                                {customers.length}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_8px_30px_-12px_rgba(27,42,76,0.25)] ring-1 ring-slate-100">
                        <div className="rounded-xl bg-[#6B9A78]/10 p-3 text-[#6B9A78]">
                            <Milk size={20} />
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">Today's milk</p>
                            <p
                                className="text-2xl font-semibold text-slate-900"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                                0 L
                            </p>
                        </div>
                    </div>

                    <button className="group flex items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-[0_8px_30px_-12px_rgba(27,42,76,0.25)] ring-1 ring-slate-100 transition hover:ring-[#E3A23C]/40">
                        <div className="rounded-xl bg-[#E3A23C]/10 p-3 text-[#E3A23C] transition group-hover:bg-[#E3A23C]/20">
                            <UserPlus size={20} />
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">Add to route</p>
                            <p className="text-sm font-semibold text-[#1B2A4C]">
                                Assign customers
                            </p>
                        </div>
                    </button>
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search customers by name or number"
                        className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-[#E3A23C]/50 focus:ring-4 focus:ring-[#E3A23C]/10"
                    />
                </div>

                {/* Route list */}
                <div>
                    <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        Delivery stops
                    </p>

                    {filteredCustomers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center">
                            <p className="text-sm text-slate-500">
                                No stops match “{search}”. Try a different name or number.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {filteredCustomers.map((customer, idx) => (
                                <div key={customer._id} className="flex gap-4">
                                    {/* Route marker + connecting line */}
                                    <div className="flex flex-col items-center">
                                        <div
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1B2A4C] text-xs font-semibold text-white"
                                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                        >
                                            {String(idx + 1).padStart(2, "0")}
                                        </div>
                                        {idx < filteredCustomers.length - 1 && (
                                            <div className="my-1 w-px flex-1 border-l border-dashed border-slate-300" />
                                        )}
                                    </div>

                                    {/* Customer card */}
                                    <div className="mb-4 flex-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-[0_8px_30px_-15px_rgba(27,42,76,0.3)]">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-slate-900">
                                                    {customer.name}
                                                </h3>

                                                <p
                                                    className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500"
                                                    style={{
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                    }}
                                                >
                                                    <Phone size={13} />
                                                    {customer.mobile}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                                                <MapPin size={13} className="text-[#6B9A78]" />
                                                {customer.address?.city || "No address"}
                                                {customer.address?.street
                                                    ? ` · ${customer.address.street}`
                                                    : ""}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DMDetails;