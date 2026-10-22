import React from "react";

const PRODUCTS = [
  {
    id: "pre-filter",
    name: "Universal RO Pre-Filter (5 Micron)",
    description:
      "Compatible with Kent, Aquaguard, Pureit, and Livpure systems. Traps silt and sediment before your RO membrane.",
    price: "₹349",
  },
  {
    id: "tap-aerator",
    name: "Anti-Clog Brass Tap Aerators (Pack of 3)",
    description:
      "Brass aeration nozzles engineered for hard water. Resists calcium crusting and prevents water splashing.",
    price: "₹499",
  },
  {
    id: "descaler",
    name: "Appliance Descaling Powder (500g)",
    description:
      "Dissolves mineral scale inside washing machine tubs and piping, restoring appliance efficiency.",
    price: "₹279",
  },
];

export default async function StorePage() {
  return (
    <div className="space-y-6 w-full">
      {/* Store Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
          GharSure Store
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Verified water filtration cartridges and appliance maintenance spares for your home.
        </p>
      </div>

      {/* Product Grid */}
      <div>
        <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider mb-3 px-1">
          Maintenance Essentials
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h3 className="text-base font-bold text-brand-navy mb-1.5">
                  {product.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                  {product.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-lg font-bold text-brand-navy">
                  {product.price}
                </span>
                <button className="px-4 py-2 rounded-xl bg-brand-orange text-white text-xs font-semibold hover:bg-brand-orange-600 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
