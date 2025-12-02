// src/pages/Reports/StockCard.jsx
import React from "react";
import { FaBoxes } from "react-icons/fa";

export default function StockCard({ toko, totalQty, totalAll, onClick }) {
  const isPusat =
    String(toko).toUpperCase() === "CILANGKAP PUSAT";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-2xl p-4 shadow-xl hover:scale-[1.03] hover:shadow-2xl transition transform"
    >
      <div className="absolute -right-10 -top-10 h-24 w-24 bg-white/20 rounded-full blur-3xl" />
      <div className="flex items-center justify-between">
        <FaBoxes className="text-2xl opacity-90" />
        <span className="text-[10px] uppercase tracking-wide bg-white/20 px-2 py-1 rounded-full">
          Stock Ready
        </span>
      </div>

      <div className="mt-3">
        <p className="text-xs opacity-80">Toko</p>
        <p className="font-bold text-sm md:text-base">{toko}</p>
      </div>

      <div className="mt-2">
        <p className="text-[11px] opacity-80">Total stok di toko ini</p>
        <p className="text-lg font-extrabold">
          {Number(totalQty || 0).toLocaleString("id-ID")} Unit
        </p>
      </div>

      {isPusat && totalAll != null && (
        <div className="mt-2 text-[11px] opacity-90">
          Total semua toko:{" "}
          <span className="font-semibold">
            {Number(totalAll || 0).toLocaleString("id-ID")} Unit
          </span>
        </div>
      )}

      <div className="mt-3 text-[11px] opacity-80">
        Klik untuk melihat detail stok &nbsp;
        <span className="underline">({toko})</span>
      </div>
    </div>
  );
}
