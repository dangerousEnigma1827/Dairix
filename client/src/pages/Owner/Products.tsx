import { Plus } from "lucide-react";
import { useState } from "react";
import ProductModal from "../../components/Owner/Products/ProductModal";
import type { Product } from "../../Types/Products"
import ProductCard from "../../components/Owner/Products/ProductCard";

function Products() {

    const [showModal, setShowModal] = useState(false);

    const products: Product[] = [
        {
            id: 1,
            name: "Fresh Milk",
            price: 60,
            stock: 120,
            unit: "1L",
            image:
                "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500",
        },
        {
            id: 2,
            name: "Curd",
            price: 45,
            stock: 90,
            unit: "500ml",
            image:
                "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500",
        },
        {
            id: 3,
            name: "Paneer",
            price: 240,
            stock: 50,
            unit: "1kg",
            image:
                "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=500",
        },
    ];

    return (
        <>
            <ProductModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />

            <div className="p-8">

                <div className="mb-8 flex items-center justify-between">

                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">
                            Products
                        </h1>

                        <p className="mt-1 text-slate-500">
                            Manage all dairy products.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white shadow hover:bg-blue-700 transition"
                    >
                        <Plus size={18} />
                        Add Product
                    </button>

                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                    {products.map((product) => 
                        <ProductCard product={product}/>
                    )}

                </div>

            </div>
        </>
    );
}

export default Products;