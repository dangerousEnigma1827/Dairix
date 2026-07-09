import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Check,
    Loader2,
    MapPin,
    Phone,
    Search,
    Truck,
    UserX,
    Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { getAllDms } from "../../api/Services/Owner/DmServices";
import { getCustomerById , assignDm} from "../../api/Services/Owner/CustomerServices";
// import { getCustomerById, assignDm } from "../../api/Services/Owner/CustomerServices";

type DM = {
    _id: string;
    name: string;
    mobile: string;
    customers?: number;
};

type Address = {
    houseNo?: string;
    street?: string;
    landmark?: string;
    city?: string;
    pincode?: string;
};

type Customer = {
    id: string;
    name: string;
    mobile: string;
    address?: Address;
    assignedDm?: string | null;
};

type customerIdType = {
    _id:string
}

const avatarPalette = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
];

const getInitials = (name: string) =>
    name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

const formatAddress = (address?: Address) => {
    if (!address) return "";
    const { houseNo, street, landmark, city, pincode } = address;
    return [houseNo, street, landmark, city, pincode]
        .filter((part) => part && part.trim().length > 0)
        .join(", ");
};

function AssignDM() {
    
    const navigate = useNavigate();
    const { customerId } = useParams();

    const [search, setSearch] = useState("");
    const [selectedDM, setSelectedDM] = useState<string | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [dms, setDms] = useState<DM[]>([]);
    const [loading, setLoading] = useState({
        getCustomerData:false
    });
    const [assigning, setAssigning] = useState(false);

    const filteredDms = dms.filter(
        (dm) =>
            dm.name.toLowerCase().includes(search.toLowerCase()) ||
            dm.mobile.includes(search)
    );

    const handleGetData = async () => {
        setLoading((prev)=>{
            return {...prev, getCustomerData:true}
        });

        try {
            const dmsRes = await getAllDms();
            setDms(dmsRes);
            
            if(!customerId) return
            const customerRes = await getCustomerById(customerId)
            console.log(customerRes)

            setCustomer({
                id: customerId || "",
                name: customerRes.name,
                mobile: customerRes.mobile,
                address: {
                    houseNo: customerRes.address.houseNo,
                    street: customerRes.address.street,
                    landmark: customerRes.address.landmark,
                    city: customerRes.address.city,
                    pincode: customerRes.address.pincode,
                },
                assignedDm: customerRes.asignedDm,
            });
        } catch (err) {
            console.log("error loading assign dm page", err);
        } finally {
            setLoading((prev)=>{
                return {...prev, getCustomerData:false}
            });
        }
    };

    const handleAssignDM = async () => {
        if (!selectedDM || !customerId) return;
        setAssigning(true);
        try {
            await assignDm(customerId, selectedDM);
            navigate(-1);
        } catch (err) {
            console.log("error assigning dm", err);
        } finally {
            setAssigning(false);
        }
    };

    useEffect(() => {
        handleGetData();
    }, []);

    const selectedDmName = dms.find((dm) => dm._id === selectedDM)?.name;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-100"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                            Assign Delivery Staff
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Choose a DM for this customer
                        </p>
                    </div>
                </div>

                {/* Customer Card */}
                {loading.getCustomerData ? (
                    <div className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-slate-100" />
                            <div className="space-y-2">
                                <div className="h-4 w-32 rounded bg-slate-100" />
                                <div className="h-3 w-24 rounded bg-slate-100" />
                            </div>
                        </div>
                    </div>
                ) : (
                    customer && (
                        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-700">
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
                                    {formatAddress(customer.address) && (
                                        <p className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <MapPin size={13} />
                                            {formatAddress(customer.address)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search
                        size={18}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search delivery staff"
                        disabled={loading.getCustomerData}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                </div>

                {/* DM Cards */}
                {loading.getCustomerData ? (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-full bg-slate-100" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-28 rounded bg-slate-100" />
                                        <div className="h-3 w-20 rounded bg-slate-100" />
                                    </div>
                                </div>
                                <div className="mt-4 h-9 rounded-xl bg-slate-50" />
                            </div>
                        ))}
                    </div>
                ) : filteredDms.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <UserX size={20} />
                        </div>
                        <p className="text-slate-500">
                            {dms.length === 0
                                ? "No delivery staff available yet."
                                : "No matches for that search."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {filteredDms.map((dm, idx) => {
                            const isSelected = (selectedDM === dm._id);
                            return (
                                <div
                                    key={dm._id}
                                    role="button"
                                    aria-pressed={isSelected}

                                    onClick={() => setSelectedDM(dm._id)}
                                    
                                    className={`cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                        isSelected
                                            ? "ring-2 ring-blue-500 "
                                            : "ring-slate-100"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarPalette[idx % avatarPalette.length]}`}
                                            >
                                                {getInitials(dm.name)}
                                            </div>
                                            <div>
                                                <h2 className="font-semibold text-slate-900">
                                                    {dm.name}
                                                </h2>
                                                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                                                    <Phone size={13} />
                                                    {dm.mobile}
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                                isSelected
                                                    ? "border-blue-600 bg-blue-600"
                                                    : "border-slate-200 bg-white"
                                            }`}
                                        >
                                            {isSelected && (
                                                <Check size={14} className="text-white" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                        <span className="flex items-center gap-2">
                                            <Users size={15} />
                                            Assigned customers
                                        </span>
                                        <span className="font-semibold text-slate-700">
                                            {dm.customers ?? 0}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Action */}
                <div className="flex items-center justify-end gap-3">
                    {selectedDmName && (
                        <p className="text-sm text-slate-500">
                            Assigning{" "}
                            <span className="font-medium text-slate-700">
                                {selectedDmName}
                            </span>
                        </p>
                    )}
                    <button
                        disabled={!selectedDM || assigning}
                        onClick={handleAssignDM}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Truck size={18} />
                        {assigning ? <>Assigning... <Loader2 className="animate-spin"/></>: "Assign DM"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AssignDM;