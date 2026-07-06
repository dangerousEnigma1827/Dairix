import { useState } from "react";
import { Plus, Phone, Users, Truck } from "lucide-react";

function DeliveryStaff() {
    const [showModal, setShowModal] = useState(false);

    const dms = [
        { id: 1, name: "Ravi Kumar", phone: "9876543210", customers: 12 },
        { id: 2, name: "Suresh", phone: "9123456780", customers: 18 },
        { id: 3, name: "Ahmed", phone: "9988776655", customers: 9 },
    ];

    return (
        <div className="p-8 space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">

                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        Delivery Staff
                    </h1>
                    <p className="mt-1 text-slate-500">
                        Manage all delivery personnel
                    </p>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white shadow hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Add DM
                </button>

            </div>

            {/* Stats (only ONE blue emphasis max per card) */}
            <div className="grid gap-6 md:grid-cols-3">

                <div className="rounded-2xl bg-white shadow p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Users size={18} />
                        <span>Total DMs</span>
                    </div>
                    <p className="text-2xl font-bold mt-3 text-slate-800">
                        3
                    </p>
                </div>

                <div className="rounded-2xl bg-white shadow p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Truck size={18} />
                        <span>Active Today</span>
                    </div>
                    <p className="text-2xl font-bold mt-3 text-slate-800">
                        2
                    </p>
                </div>

                <div className="rounded-2xl bg-white shadow p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Phone size={18} />
                        <span>Total Customers</span>
                    </div>
                    <p className="text-2xl font-bold mt-3 text-slate-800">
                        39
                    </p>
                </div>

            </div>

            {/* Cards */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                {dms.map((dm) => (
                    <div
                        key={dm.id}
                        className="rounded-2xl bg-white shadow transition hover:shadow-lg"
                    >

                        <div className="p-5">

                            {/* Name (ONLY IMPORTANT BLUE ACCENT HERE) */}
                            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                                <Users size={18} className="text-blue-600" />
                                {dm.name}
                            </h2>

                            {/* Phone (NO blue icon now) */}
                            <p className="mt-2 text-sm text-slate-500 flex items-center gap-2">
                                <Phone size={16} className="text-slate-400" />
                                {dm.phone}
                            </p>

                            {/* Customers (NO blue icon here either) */}
                            <div className="mt-5">
                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                    <Truck size={16} className="text-slate-400" />
                                    Assigned Customers
                                </p>

                                <p className="text-xl font-bold text-slate-800 mt-1 ml-6">
                                    {dm.customers}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="mt-6 flex justify-between items-center">

                                <button className="text-sm text-blue-600 hover:underline">
                                    View Details
                                </button>

                                <button className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition">
                                    Assign
                                </button>

                            </div>

                        </div>

                    </div>
                ))}

            </div>

        </div>
    );
}

export default DeliveryStaff;