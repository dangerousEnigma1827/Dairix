import { useEffect, useState } from "react";
import {
    Plus,
    Phone,
    Users,
    Truck,
    Search,
    ArrowUpRight,
    AlertCircle,
    MapPin,
    UserCircle2,
} from "lucide-react";
import { getAllCustomers } from "../../api/Services/Owner/CustomerServices";

type Customer = {
    id: number;
    name: string;
    mobile: string;
    address: string;
    assignedDm: string | null;
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

const dummyCustomers: Customer[] = [
    {
        id: 1,
        name: "Anita Sharma",
        mobile: "9876543210",
        address: "Sector 5, Main Road",
        assignedDm: "Ravi Kumar",
    },
    {
        id: 2,
        name: "Vikram Reddy",
        mobile: "9845012345",
        address: "Plot 12, Green Avenue",
        assignedDm: null,
    },
    {
        id: 3,
        name: "Priya Desai",
        mobile: "9900112233",
        address: "Flat 302, Lake View Apartments",
        assignedDm: "Suresh Yadav",
    },
    {
        id: 4,
        name: "Karthik Nair",
        mobile: "9765432109",
        address: "House 21, Nehru Colony",
        assignedDm: null,
    },
    {
        id: 5,
        name: "Meera Iyer",
        mobile: "9812345678",
        address: "Sector 9, Church Road",
        assignedDm: "Ravi Kumar",
    },
    {
        id: 6,
        name: "Arjun Menon",
        mobile: "9988776655",
        address: "Plot 45, Industrial Layout",
        assignedDm: "Dinesh Rao",
    },
];

function Customers() {
    const [search, setSearch] = useState("");
    const [customers] = useState<Customer[]>(dummyCustomers);

    const filteredCustomers = customers.filter(
        (customer) =>
            customer.name.toLowerCase().includes(search.toLowerCase()) ||
            customer.mobile.includes(search)
    );

    const totalCustomers = customers.length;
    const assignedCount = customers.filter((c) => c.assignedDm).length;
    const unassignedCount = totalCustomers - assignedCount;

    //api calls
    const handleGetAllCustomers = async () => {
        try{
            console.log("first")
            let req=await getAllCustomers();
            console.log(req)
        }catch(err){
            console.log("error getting all customers ", err);
        }
    }


    useEffect(()=>{
        handleGetAllCustomers()
    },[])

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                            Customers
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 md:text-base">
                            Manage all registered customers and assign delivery staff
                        </p>
                    </div>

                    <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                        <Plus size={18} />
                        Add Customer
                    </button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Customers</p>
                            <p className="text-2xl font-bold text-slate-900">{totalCustomers}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Truck size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Assigned Customers</p>
                            <p className="text-2xl font-bold text-slate-900">{assignedCount}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Unassigned Customers</p>
                            <p className="text-2xl font-bold text-slate-900">{unassignedCount}</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search
                        size={18}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by customer name or mobile"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                </div>

                {/* Cards */}
                {filteredCustomers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                        {customers.length === 0 ? (
                            <>
                                <p className="text-slate-500">
                                    No customers yet. Add your first customer to start
                                    deliveries.
                                </p>
                                <button className="mx-auto mt-5 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                                    <Plus size={18} />
                                    Add Customer
                                </button>
                            </>
                        ) : (
                            <p className="text-slate-500">No matches for that search.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {filteredCustomers.map((customer, idx) => (
                            <div
                                key={customer.id}
                                className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
                            >
                                {/* Top section */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarPalette[idx % avatarPalette.length]}`}
                                    >
                                        {getInitials(customer.name)}
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-slate-900">
                                            {customer.name}
                                        </h2>
                                        <p className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <Phone size={13} />
                                            {customer.mobile}
                                        </p>
                                    </div>
                                </div>

                                {/* Assigned DM */}
                                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Assigned Delivery Staff
                                    </p>
                                    {customer.assignedDm ? (
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                            <UserCircle2 size={16} className="text-blue-600" />
                                            {customer.assignedDm}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                                            No Delivery Staff Assigned
                                        </span>
                                    )}
                                </div>

                                {/* Address */}
                                <div className="mt-3 flex items-start gap-2 px-1 text-sm text-slate-500">
                                    <MapPin size={15} className="mt-0.5 shrink-0" />
                                    <span className="line-clamp-2">{customer.address}</span>
                                </div>

                                {/* Bottom actions */}
                                <div className="mt-4 flex items-center justify-between">
                                    <button className="flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:gap-1.5 hover:text-blue-700">
                                        View details
                                        <ArrowUpRight size={14} />
                                    </button>

                                    <button className="rounded-lg bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
                                        {customer.assignedDm ? "Change DM" : "Assign DM"}
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

export default Customers;