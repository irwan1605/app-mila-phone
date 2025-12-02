// src/pages/Reports/StockChart.jsx
import React from "react";

/**
 * Contoh penggunaan:
 * <StockChart data={stockPerToko} />
 * data: [{ toko: "CILANGKAP PUSAT", totalQty: 120 }, ...]
 */
export default function StockChart({ data = [] }) {
  if (!data.length) return null;

  const maxQty = Math.max(
    ...data.map((d) => Number(d.totalQty || 0)),
    1
  );

  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="flex items-end gap-3 h-48">
        {data.map((row) => {
          const percent =
            (Number(row.totalQty || 0) / maxQty) * 100;

          return (
            <div
              key={row.toko}
              className="flex flex-col items-center text-[10px] min-w-[40px]"
            >
              <div
                className="w-6 md:w-8 bg-indigo-500 rounded-t-lg shadow-md transition-all"
                style={{ height: `${percent || 5}%` }}
              />
              <span className="mt-1 text-[9px] text-slate-600 text-center">
                {row.toko}
              </span>
              <span className="text-[9px] text-slate-400">
                {Number(row.totalQty || 0).toLocaleString("id-ID")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
