import { useState } from "react";
import api from "../../../api/api";
import toast from "react-hot-toast";
import {
    X,
    Milk,
    IndianRupee,
    Package,
    Warehouse,
    Image as ImageIcon,
    Loader,
} from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

function ProductModal({ isOpen, onClose }: Props) {
    const [loading, setLoading]=useState({
        addProductLoading:false
    })

    const [formData, setFormData]=useState({
        name:"",price:"",unit:"",image:""
    })

    const handleAddProduct = async ()=>{
        try{
            setLoading((prev)=>{
                return {...prev, addProductLoading:true}
            })

            let req= await api.post('/products', formData)
            onClose()
             toast("Added Product Successfully!", {
                style: { background: '#1E88E5', color: '#fff' }
            })
            console.log(formData)
        }catch(err:any){
            console.log("error adding a product,", err)

            if(err?.response?.data?.message=="Validation Error"){
                toast("Validation Error, Fill All Inputs!", {
                    style: { background: '#1E88E5', color: '#fff' }
                })
            }
        }finally{
            setLoading((prev)=>{
                return {...prev, addProductLoading:false}
            })
            
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">

            <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between bg-blue-600 px-6 py-5 text-white">

                    <div>
                        <h2 className="text-2xl font-bold">
                            Add Product
                        </h2>

                        <p className="mt-1 text-sm text-blue-100">
                            Add a new dairy product to your inventory
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 transition hover:bg-blue-500"
                    >
                        <X size={22} />
                    </button>

                </div>

                {/* Form */}
                <div className="space-y-5 p-6">

                    {/* Product Name */}
                    <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Product Name
                        </label>

                        <div className="relative">

                            <Milk
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                            />

                            <input
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData((prev)=>{
                                        return {...prev, name:e.target.value}
                                    })
                                }}
                                placeholder="Fresh Milk"
                                className="w-full rounded-xl bg-slate-100 py-3 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-blue-200"
                            />

                        </div>

                    </div>

                    {/* Price + Unit */}
                    <div className="grid grid-cols-2 gap-4">

                        <div>

                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Price (₹)
                            </label>

                            <div className="relative">

                                <IndianRupee
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                                />

                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => {
                                        setFormData((prev)=>{
                                            return {...prev, price:e.target.value}
                                        })
                                    }}
                                    placeholder="60"
                                    className="w-full rounded-xl bg-slate-100 py-3 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-blue-200"
                                />

                            </div>

                        </div>

                        <div>

                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Unit
                            </label>

                            <div className="relative">

                                <Package
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                                />

                                <input
                                    value={formData.unit}
                                    onChange={(e) => {
                                        setFormData((prev)=>{
                                            return {...prev, unit:e.target.value}
                                        })
                                    }}
                                    placeholder="1 L"
                                    className="w-full rounded-xl bg-slate-100 py-3 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-blue-200"
                                />

                            </div>

                        </div>

                    </div>


                    {/* Image URL */}
                    <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Product Image
                        </label>

                        <div className="relative">

                            <ImageIcon
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                            />

                            <input
                                type="url"
                                value={formData.image}
                                onChange={(e) => {
                                    setFormData((prev)=>{
                                        return {...prev, image:e.target.value}
                                    })
                                }}
                                placeholder="https://example.com/product.jpg"
                                className="w-full rounded-xl bg-slate-100 py-3 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-blue-200"
                            />

                        </div>

                        {formData.image && (
                            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">

                                <img
                                    src={formData.image}
                                    alt="Preview"
                                    className="h-44 w-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />

                            </div>
                        )}

                    </div>

                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 bg-slate-50 px-6 py-5">

                    <button
                        onClick={onClose}
                        className="rounded-xl px-5 py-2 font-medium text-slate-600 transition hover:bg-slate-200 cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        className="rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white shadow-md transition hover:bg-blue-700 cursor-pointer"
                        onClick={(e)=>{
                            handleAddProduct()
                        }}
                    >
                        {loading.addProductLoading ? <Loader/>:"Add Product"}
                    </button>

                </div>

            </div>

        </div>
    );
}

export default ProductModal;