import { useEffect, useState } from "react";
import {
    Plus,
    Users,
    Truck,
    Search,
    AlertCircle,
    Loader2,
} from "lucide-react";

import { getAllCustomers } from "../../api/Services/Owner/CustomerServices";
import CustomerCard from "../../components/Owner/Customers/CustomerCard";
import type { Customer } from "../../components/Owner/Customers/CustomerCard";
import Spinner from "../../components/Spinner";


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
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={20}/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Total Customers
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {totalCustomers}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Truck size={20}/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Assigned Customers
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {assignedCount}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                            <AlertCircle size={20}/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                Unassigned Customers
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {unassignedCount}
                            </p>
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
                        onChange={(e)=>setSearch(e.target.value)}
                        placeholder="Search by customer name or mobile"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                </div>

                {
                    loading.getCustomers && 
                    <div className="rounded-2xl border border-dashed border-slate-200 flex gap-10 justify-center flex flex-col items-center bg-white p-12 text-center">
                        <p className="text-slate-500">
                            Fetching Customers...
                        </p>
                        <Spinner/>
                    </div>
                }

                {/* Customer Cards */}
                {
                    (filteredCustomers.length === 0) && (loading.getCustomers == false) ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                            {
                                customers.length === 0 ? (
                                    <>
                                        <p className="text-slate-500">
                                            No customers yet. Add your first customer to start deliveries.
                                        </p>
                                        <button className="mx-auto mt-5 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                                            <Plus size={18}/>
                                            Add Customer
                                        </button>
                                    </>
                                ) : (
                                    <p className="text-slate-500">
                                        No matches for that search.
                                    </p>
                                )
                            }
                        </div>
                    ) : (
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
                }


            </div>


        </div>

    );
}


export default Customers;