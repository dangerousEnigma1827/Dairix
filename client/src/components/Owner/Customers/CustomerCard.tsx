import {
    Phone,
    ArrowUpRight,
    Home,
    MapPinned,
    Building2,
    Map,
    UserCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Address = {
    houseNo: string;
    street: string;
    landmark: string;
    city: string;
    pincode: string;
};

export type Customer = {
    _id: string;
    name: string;
    mobile: string;
    address: Address;
    assignedDm: string | null;
};

type CustomerCardProps = {
    customer: Customer;
    idx: number;
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


function CustomerCard({ customer, idx }: CustomerCardProps) {
console.log(customer)

    let navigate=useNavigate()
    return (
        <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">

            {/* Header */}
            <div className="flex items-center gap-3">
                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        avatarPalette[idx % avatarPalette.length]
                    }`}
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


            {/* Delivery Staff */}
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">

                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Assigned Delivery Staff
                </p>


                {customer.assignedDm ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                        <UserCircle2
                            size={16}
                            className="text-blue-600"
                        />

                        {customer.assignedDm}
                    </span>
                ) : (
                    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                        No Delivery Staff Assigned
                    </span>
                )}

            </div>



            {/* Address */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">

                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Address
                </p>


                <div className="space-y-2 text-sm text-slate-600">


                    <div className="flex items-center gap-2">
                        <Home
                            size={15}
                            className="shrink-0 text-blue-600"
                        />

                        <span>
                            {customer.address.houseNo || "-"}
                        </span>
                    </div>



                    <div className="flex items-center gap-2">
                        <MapPinned
                            size={15}
                            className="shrink-0 text-emerald-600"
                        />

                        <span>
                            {customer.address.street || "-"}
                        </span>
                    </div>



                    <div className="flex items-center gap-2">
                        <Building2
                            size={15}
                            className="shrink-0 text-amber-600"
                        />

                        <span>
                            {customer.address.landmark || "-"}
                        </span>
                    </div>



                    <div className="flex items-center gap-2">
                        <Map
                            size={15}
                            className="shrink-0 text-violet-600"
                        />

                        <span>
                            {customer.address.city || "-"}
                            {customer.address.pincode &&
                                ` - ${customer.address.pincode}`}
                        </span>
                    </div>


                </div>

            </div>



            {/* Actions */}
            <div className="mt-4 flex items-center justify-between">

                <button className="flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:gap-1.5 hover:text-blue-700">

                    View details

                    <ArrowUpRight size={14}/>

                </button>



                <button className="rounded-lg bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200" onClick={(e)=>{
                    navigate(`/owner/customers/${customer._id}/assign-dm`)
                }}>

                    {customer.assignedDm
                        ? "Change DM"
                        : "Assign DM"}

                </button>

            </div>


        </div>
    );
}


export default CustomerCard;