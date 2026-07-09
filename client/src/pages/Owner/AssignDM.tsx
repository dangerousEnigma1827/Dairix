import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Check,
    Phone,
    Search,
    Truck,
    Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { getAllDms } from "../../api/Services/Owner/DmServices";
// import { getCustomerById, assignDm } from "../../api/Services/Owner/CustomerServices";

type DM = {
    id: string;
    name: string;
    mobile: string;
    customers?: number;
};


type Customer = {
    id: string;
    name: string;
    mobile: string;
    address?: string;
    assignedDm?: string | null;
};


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



function AssignDM() {

    const navigate = useNavigate();
    const { customerId } = useParams();
    const [search, setSearch] = useState("");
    const [selectedDM, setSelectedDM] = useState<string | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [dms, setDms] = useState<DM[]>([]);

    const filteredDms = dms.filter(
        (dm) =>
            dm.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
            dm.mobile.includes(search)
    );

    const handleGetData = async () => {
        try {
            const dmsRes = await getAllDms();
            setDms(dmsRes);
            // replace with API later
            setCustomer({
                id: customerId || "",
                name: "Rahul Sharma",
                mobile: "9876543210",
                address: "Hyderabad",
                assignedDm: null,
            });


        } catch(err) {

            console.log(
                "error loading assign dm page",
                err
            );

        }

    };



    const handleAssignDM = async () => {

        if(!selectedDM || !customerId)
            return;


        try {

            // await assignDm(customerId, selectedDM);


            navigate("/customers");


        } catch(err) {

            console.log(
                "error assigning dm",
                err
            );

        }

    };



    useEffect(()=>{

        handleGetData();

    },[]);



    return (

        <div className="min-h-screen bg-slate-50 p-6 md:p-8">

            <div className="mx-auto max-w-6xl space-y-6">


                {/* Header */}

                <div className="flex items-center gap-3">

                    <button
                        onClick={()=>navigate(-1)}
                        className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100 hover:bg-slate-100"
                    >
                        <ArrowLeft size={20}/>
                    </button>


                    <div>

                        <h1 className="text-2xl font-bold text-slate-900">
                            Assign Delivery Staff
                        </h1>

                        <p className="text-sm text-slate-500">
                            Choose a DM for this customer
                        </p>

                    </div>

                </div>




                {/* Customer Card */}

                {
                    customer && (

                        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">

                            <div className="flex items-center gap-4">

                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">

                                    {getInitials(customer.name)}

                                </div>


                                <div>

                                    <h2 className="font-semibold text-slate-900">
                                        {customer.name}
                                    </h2>


                                    <p className="flex items-center gap-1 text-sm text-slate-500">

                                        <Phone size={14}/>

                                        {customer.mobile}

                                    </p>


                                    <p className="text-sm text-slate-500">
                                        {customer.address}
                                    </p>

                                </div>


                            </div>


                        </div>

                    )
                }




                {/* Search */}

                <div className="relative max-w-sm">

                    <Search
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />


                    <input

                        value={search}

                        onChange={(e)=>setSearch(e.target.value)}

                        placeholder="Search delivery staff"

                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-blue-100"

                    />

                </div>




                {/* DM Cards */}

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">


                    {
                        filteredDms.map((dm,idx)=>(


                            <div

                                key={dm.id}

                                onClick={()=>setSelectedDM(dm.id)}

                                className={`cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 transition hover:shadow-md ${
                                    selectedDM === dm.id
                                    ? "ring-2 ring-blue-500"
                                    : "ring-slate-100"
                                }`}

                            >


                                <div className="flex items-center justify-between">


                                    <div className="flex items-center gap-3">


                                        <div
                                            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${avatarPalette[idx % avatarPalette.length]}`}
                                        >

                                            {getInitials(dm.name)}

                                        </div>


                                        <div>

                                            <h2 className="font-semibold text-slate-900">
                                                {dm.name}
                                            </h2>


                                            <p className="flex items-center gap-1 text-sm text-slate-500">

                                                <Phone size={13}/>

                                                {dm.mobile}

                                            </p>

                                        </div>


                                    </div>



                                    {
                                        selectedDM === dm.id && (

                                            <Check
                                                size={20}
                                                className="text-blue-600"
                                            />

                                        )
                                    }


                                </div>




                                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">

                                    <Users size={16}/>

                                    Assigned customers

                                </div>


                            </div>


                        ))
                    }


                </div>




                {/* Button */}

                <div className="flex justify-end">

                    <button

                        disabled={!selectedDM}

                        onClick={handleAssignDM}

                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"

                    >

                        <Truck size={18}/>

                        Assign DM

                    </button>

                </div>



            </div>

        </div>

    );

}


export default AssignDM;