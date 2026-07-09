import { useState, useEffect} from "react";

//icons
import { Plus } from "lucide-react";

//types
import type { Product } from "../../Types/Products"

//components
import ProductModal from "../../components/Owner/Products/ProductModal";
import ProductCard from "../../components/Owner/Products/ProductCard";

//services
import { getProducts } from "../../api/Services/Owner/ProductServices";

function Products() {

    const [showModal, setShowModal] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState({
        getAllProductsLoading:false
    });

    const fetchProducts = async () => {
        try {
            setLoading((prev)=>{
                return {...prev, getAllProductsLoading:true}
            });

            const data = await getProducts();
            setProducts(data);

        } catch (err) {
            console.log("Error fetching products:", err);
        } finally {
                setLoading((prev)=>{
                return {...prev, getAllProductsLoading:false}
            });
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [showModal]);


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