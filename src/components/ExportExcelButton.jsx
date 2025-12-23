import React from "react";
import { exportPenjualanExcel } from "../utils/exportPenjualanExcel";

export default function ExportExcelButton({ transaksi = [] }) {
  return (
    <button
      onClick={() =>
        exportPenjualanExcel({
          transaksi,
          fileName: `Laporan_Penjualan_${new Date()
            .toISOString()
            .slice(0, 10)}.xlsx`,
        })
      }
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
    >
      ⬇️ Download Excel
    </button>
  );
}
