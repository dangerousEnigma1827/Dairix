import { useEffect, useState } from "react";
import { Plus, Phone, Users, Truck, Search, ArrowUpRight } from "lucide-react";

//components
import AddDMModal from "../../components/Owner/DeliveryStaff/AddDMModal";

//services
import { getAllDms } from "../../api/Services/Owner/DmServices";
import { useNavigate } from "react-router-dom";
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";
import { getAllCustomers } from "../../api/Services/Owner/CustomerServices";
import { getDmCustomersByDmIdService } from "../../api/Services/Dm/DeliveryEntryServices";

type DM = {
    _id: string;
    name: string;
    mobile: string;
};


function DeliveryStaff() {
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");

    const navigate=useNavigate()
    const [dms, setDms] = useState<DM[]>([]);
    const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({});

    const handleGetDms = async () => {
    try {
        const req = await getAllDms();
        setDms(req);
        await handleGetCustomerCounts(req);
    } catch (err: any) {
        console.log("error occured handling all dms", err);
    }
};

    const handleGetCustomerCounts = async (dmsList: DM[]) => {
        try {
            const counts: Record<string, number> = {};

            await Promise.all(
                dmsList.map(async (dm) => {
                    const customers = await getDmCustomersByDmIdService(dm._id);
                    counts[dm._id] = customers.length;
                })
            );

            setCustomerCounts(counts);
        } catch (err) {
            console.log("Error fetching customer counts:", err);
        }
    };

    const filteredDms = dms?.filter(
        (dm) =>
            dm.name.toLowerCase().includes(search.toLowerCase()) ||
            dm.mobile.includes(search)
    );

    let [totalCustomers, setTotalCustomers] = useState<number>();

    const getTotalCustomers = async () => {
        let req = await getAllCustomers()
        console.log(req.length)
        setTotalCustomers(req.length);
    }

    useEffect(()=>{
        handleGetDms()
        getTotalCustomers()
    },[])

    const activeCount = Object.values(customerCounts).filter(count => count > 0).length;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-8">

                <AddDMModal isOpen={showModal} handleGetDms={handleGetDms} onClose={() => setShowModal(false)} />

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
                        onClick={() => {
                            setShowModal(true)
                            
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Add DM
                    </button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total DMs</p>
                            <p className="text-2xl font-bold text-slate-900">{dms?.length}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Truck size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Active today</p>
                            <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
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
                        placeholder="Search by name or mobile"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                </div>

                {/* Cards */}
                {filteredDms?.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                        <p className="text-slate-500">
                            {dms.length === 0
                                ? "No delivery staff yet — add your first DM to get started."
                                : "No matches for that search."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {filteredDms?.map((dm, idx) => (
                            <div
                                key={dm._id}
                                className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarPalette[idx % avatarPalette.length]}`}
                                    >
                                        {getInitials(dm.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate font-semibold text-slate-900">{dm.name}</h2>
                                        <p className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <Phone size={13} />
                                            {dm.mobile}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                    <span className="flex items-center gap-2 text-sm text-slate-500">
                                        <Truck size={15} />
                                        Assigned customers
                                    </span>
                                    <span className="text-lg font-bold text-slate-900">
                                        {customerCounts[dm._id] ?? 0}
                                    </span>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <button
                                        className="flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:gap-1.5 hover:text-blue-700"
                                        onClick={()=>{
                                            navigate(`/owner/delivery-staff/${dm._id}`)
                                        }}
                                    >
                                        View details
                                        <ArrowUpRight size={14} />
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