import { useState, useEffect, useMemo } from "react";

// icons
import { Plus, Package, IndianRupee, Layers, Search, Loader2 } from "lucide-react";

// types
import type { Product } from "../../Types/Products";

// components
import ProductModal from "../../components/Owner/Products/ProductModal";
import ProductCard from "../../components/Owner/Products/ProductCard";

// services
import { getProducts } from "../../api/Services/Owner/ProductServices";

function Products() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState({
    getAllProductsLoading: false,
  });

  const fetchProducts = async () => {
    try {
      setLoading((prev) => {
        return { ...prev, getAllProductsLoading: true };
      });

      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.log("Error fetching products:", err);
    } finally {
      setLoading((prev) => {
        return { ...prev, getAllProductsLoading: false };
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [showModal]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.unit.toLowerCase().includes(search.toLowerCase())
  );

  const avgPrice = useMemo(
    () => (products.length ? products.reduce((s, p) => s + p.price, 0) / products.length : 0),
    [products]
  );

  const distinctUnits = useMemo(() => new Set(products.map((p) => p.unit)).size, [products]);

  return (
    <>
      <ProductModal isOpen={showModal} onClose={() => setShowModal(false)} />

      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* ── Header ── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Products</h1>
              <p className="mt-1 text-sm text-slate-500 md:text-base">
                Manage all dairy products in your catalog
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>

          {/* ── Stats ── */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total products</p>
                <p className="text-2xl font-bold text-slate-900">{products.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <IndianRupee size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Average price</p>
                <p className="text-2xl font-bold text-slate-900">₹{avgPrice.toFixed(0)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Layers size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Units offered</p>
                <p className="text-2xl font-bold text-slate-900">{distinctUnits}</p>
              </div>
            </div>
          </div>

          {/* ── Search ── */}
          <div className="relative max-w-sm">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or unit"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {/* ── Loading ── */}
          {loading.getAllProductsLoading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Loader2 size={22} className="text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Fetching products…</p>
            </div>
          )}

          {/* ── Empty states ── */}
          {!loading.getAllProductsLoading && filteredProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              {products.length === 0 ? (
                <>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                    <Package size={22} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500">
                    No products yet — add your first product to build your catalog.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mx-auto mt-5 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    Add Product
                  </button>
                </>
              ) : (
                <p className="text-slate-500">No matches for that search.</p>
              )}
            </div>
          )}

          {/* ── Product grid ── */}
          {!loading.getAllProductsLoading && filteredProducts.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Products;