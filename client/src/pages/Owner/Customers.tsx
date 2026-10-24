import { useEffect, useState } from "react";
import {
    Plus,
    Users,
    Truck,
    Search,
    AlertCircle,
    X,
} from "lucide-react";

import { getAllCustomers } from "../../api/Services/Owner/CustomerServices";
import CustomerCard from "../../components/Owner/Customers/CustomerCard";
import type { Customer } from "../../components/Owner/Customers/CustomerCard";


function Customers() {
    const [search, setSearch] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState({
        getCustomers:false
    })

    const filteredCustomers = customers.filter(
        (customer) =>
            customer.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
            customer.mobile.includes(search)
    );

    const totalCustomers = customers.length;

    const assignedCount = customers.filter(
        (customer) => customer.assignedDm
    ).length;

    const unassignedCount = totalCustomers - assignedCount;

    const assignedPct = totalCustomers > 0 ? Math.round((assignedCount / totalCustomers) * 100) : 0;
    const unassignedPct = totalCustomers > 0 ? 100 - assignedPct : 0;

    const handleGetAllCustomers = async () => {
        setLoading((prev)=>{
            return {...prev, getCustomers:true}
        })

        try {
            const req = await getAllCustomers();
            console.log(req);
            setCustomers(req);
        } catch (err) {
            console.log(
                "error getting all customers ",
                err
            );
        }finally{
            setLoading((prev)=>{
                return {...prev, getCustomers:false}
            })
        }
    };

    useEffect(() => {
        handleGetAllCustomers();
    }, []);

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
                        <Plus size={18}/>
                        Add Customer
                    </button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={20}/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Total customers
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {totalCustomers}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Truck size={20}/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Assigned customers
                            </p>
                            <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl font-bold text-slate-900">
                                    {assignedCount}
                                </p>
                                {totalCustomers > 0 && (
                                    <span className="text-xs font-medium text-emerald-600">{assignedPct}%</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <AlertCircle size={20}/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Unassigned customers
                            </p>
                            <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl font-bold text-slate-900">
                                    {unassignedCount}
                                </p>
                                {totalCustomers > 0 && unassignedCount > 0 && (
                                    <span className="text-xs font-medium text-red-600">{unassignedPct}%</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-sm w-full">
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={search}
                            onChange={(e)=>setSearch(e.target.value)}
                            placeholder="Search by customer name or mobile"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-9 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                    {search && !loading.getCustomers && (
                        <p className="text-sm text-slate-500">
                            {filteredCustomers.length} result{filteredCustomers.length === 1 ? "" : "s"} for "{search}"
                        </p>
                    )}
                </div>

                {/* Loading skeleton */}
                {loading.getCustomers && (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="animate-pulse space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-full bg-slate-100" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-2/3 rounded bg-slate-100" />
                                        <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                                    </div>
                                </div>
                                <div className="h-16 rounded-xl bg-slate-100" />
                                <div className="h-16 rounded-xl bg-slate-100" />
                                <div className="h-8 w-full rounded-xl bg-slate-100" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Customer Cards */}
                {
                    (filteredCustomers.length === 0) && (loading.getCustomers == false) ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Users size={22} />
                            </div>
                            {
                                customers.length === 0 ? (
                                    <>
                                        <p className="font-semibold text-slate-800">
                                            No customers yet
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Add your first customer to start deliveries.
                                        </p>
                                        <button className="mx-auto mt-5 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                                            <Plus size={18}/>
                                            Add Customer
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold text-slate-800">
                                            No matches found
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Try a different name or mobile number.
                                        </p>
                                        <button
                                            onClick={() => setSearch("")}
                                            className="mt-4 text-sm font-medium text-blue-600 hover:underline"
                                        >
                                            Clear search
                                        </button>
                                    </>
                                )
                            }
                        </div>
                    ) : (
                        !loading.getCustomers && (
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {
                                    filteredCustomers.map(
                                        (customer, idx)=>(
                                            <CustomerCard
                                                key={idx}
                                                customer={customer}
                                                idx={idx}
                                            />
                                        )
                                    )
                                }
                            </div>
                        )
                    )
                }


            </div>


        </div>

    );
}


export default Customers;