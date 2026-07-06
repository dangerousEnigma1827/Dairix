import type { Product } from "../../../Types/Products"

type Props = {
    product: Product;
};

function ProductCard({ product }: Props) {
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-lg">

            <img
                src={product.image}
                alt={product.name}
                className="h-48 w-full object-cover"
            />

            <div className="p-5">

                <h2 className="text-xl font-semibold">
                    {product.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    {product.unit}
                </p>

                <div className="mt-5 flex items-center justify-between">

                    <span className="text-xl font-bold text-blue-600">
                        ₹{product.price}
                    </span>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                        Stock: {product.stock}
                    </span>

                </div>

            </div>

        </div>
    );
}

export default ProductCard;