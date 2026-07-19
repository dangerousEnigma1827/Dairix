import { useState } from "react";
import { Milk, ImageOff } from "lucide-react";
import type { Product } from "../../../Types/Products";

type Props = {
  product: Product;
};

function ProductCard({ product }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-blue-100">
      {/* ── Image ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
        {!imgError && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-300">
            {product.image ? <ImageOff size={26} /> : <Milk size={26} />}
            <span className="text-[11px] font-medium text-slate-400">No image</span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
          {product.unit}
        </span>
      </div>

      {/* ── Details ── */}
      <div className="p-5">
        <h2 className="truncate text-lg font-semibold text-slate-900">{product.name}</h2>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <span className="text-xl font-bold text-blue-600">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            <span className="ml-1 text-xs text-slate-400">/ {product.unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;