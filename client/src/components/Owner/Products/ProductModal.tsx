import { useState } from "react";
import {
    X,
    Milk,
    IndianRupee,
    Package,
    Warehouse,
    Image as ImageIcon,
} from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

function ProductModal({ isOpen, onClose }: Props) {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [unit, setUnit] = useState("");
    const [stock, setStock] = useState("");
    const [image, setImage] = useState("");

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
                                value={name}
                                onChange={(e) => setName(e.target.value)}
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
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
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
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="1 L"
                                    className="w-full rounded-xl bg-slate-100 py-3 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-blue-200"
                                />

                            </div>

                        </div>

                    </div>

                    {/* Stock */}
                    <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Available Stock
                        </label>

                        <div className="relative">

                            <Warehouse
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                            />

                            <input
                                type="number"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                placeholder="100"
                                className="w-full rounded-xl bg-slate-100 py-3 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-blue-200"
                            />

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
                                value={image}
                                onChange={(e) => setImage(e.target.value)}
                                placeholder="https://example.com/product.jpg"
                                className="w-full rounded-xl bg-slate-100 py-3 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-blue-200"
                            />

                        </div>

                        {image && (
                            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">

                                <img
                                    src={image}
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
                        className="rounded-xl px-5 py-2 font-medium text-slate-600 transition hover:bg-slate-200"
                    >
                        Cancel
                    </button>

                    <button
                        className="rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white shadow-md transition hover:bg-blue-700"
                    >
                        Add Product
                    </button>

                </div>

            </div>

        </div>
    );
}

export default ProductModal;