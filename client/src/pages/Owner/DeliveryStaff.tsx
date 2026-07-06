import { useState } from "react";
import { Plus, Phone, Users, Truck, Search, ArrowUpRight } from "lucide-react";
import AddDMModal from "../../components/Owner/DeliveryStaff/AddDMModal";

type DM = {
    id: number;
    name: string;
    phone: string;
    customers: number;
    active: boolean;
};

const avatarPalette = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
];

const getInitials = (name: string) =>
    name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

function DeliveryStaff() {
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");

    const [dms, setDms] = useState<DM[]>([
        { id: 1, name: "Ravi Kumar", phone: "9876543210", customers: 12, active: true },
        { id: 2, name: "Suresh", phone: "9123456780", customers: 18, active: true },
        { id: 3, name: "Ahmed", phone: "9988776655", customers: 9, active: false },
    ]);

    const handleDMAdded = (newDM: { name: string; phone: string }) => {
        setDms((prev) => [
            ...prev,
            {
                id: Date.now(),
                name: newDM.name,
                phone: newDM.phone,
                customers: 0,
                active: false,
            },
        ]);
    };

    const filteredDms = dms.filter(
        (dm) =>
            dm.name.toLowerCase().includes(search.toLowerCase()) ||
            dm.phone.includes(search)
    );

    const activeCount = dms.filter((dm) => dm.active).length;
    const totalCustomers = dms.reduce((sum, dm) => sum + dm.customers, 0);

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-8">

                <AddDMModal isOpen={showModal} onClose={() => setShowModal(false)} />

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                            Delivery staff
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 md:text-base">
                            Manage all delivery personnel and their assigned customers
                        </p>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Add DM
                    </button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total DMs</p>
                            <p className="text-2xl font-bold text-slate-900">{dms.length}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Truck size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Active today</p>
                            <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Phone size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total customers</p>
                            <p className="text-2xl font-bold text-slate-900">{totalCustomers}</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or phone"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                </div>

                {/* Cards */}
                {filteredDms.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                        <p className="text-slate-500">
                            {dms.length === 0
                                ? "No delivery staff yet — add your first DM to get started."
                                : "No matches for that search."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {filteredDms.map((dm, idx) => (
                            <div
                                key={dm.id}
                                className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarPalette[idx % avatarPalette.length]}`}
                                        >
                                            {getInitials(dm.name)}
                                        </div>
                                        <div>
                                            <h2 className="font-semibold text-slate-900">{dm.name}</h2>
                                            <p className="flex items-center gap-1.5 text-sm text-slate-500">
                                                <Phone size={13} />
                                                {dm.phone}
                                            </p>
                                        </div>
                                    </div>

                                    <span
                                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                            dm.active
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-slate-100 text-slate-500"
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                dm.active ? "bg-emerald-500" : "bg-slate-400"
                                            }`}
                                        />
                                        {dm.active ? "Active" : "Offline"}
                                    </span>
                                </div>

                                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                    <span className="flex items-center gap-2 text-sm text-slate-500">
                                        <Truck size={15} />
                                        Assigned customers
                                    </span>
                                    <span className="text-lg font-bold text-slate-900">{dm.customers}</span>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <button className="flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:gap-1.5 hover:text-blue-700">
                                        View details
                                        <ArrowUpRight size={14} />
                                    </button>

                                    <button className="rounded-lg bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
                                        Assign
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DeliveryStaff;