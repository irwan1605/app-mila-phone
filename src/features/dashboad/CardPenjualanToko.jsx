import React, { memo } from "react";
import { useNavigate } from "react-router-dom";

const rupiah = (value) =>
  Number(value || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

function CardPenjualanToko({ dataToko = [] }) {
  const navigate = useNavigate();

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-500">
          Total Toko : {dataToko.length}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {dataToko.map((item, index) => (
          <div
            key={item.toko}
            onClick={() => {
              navigate(
                `/toko/${item.toko
                  .toLowerCase()
                  .replace(/\s+/g, "-")}/penjualan`,
                {
                  state: {
                    filterToko: item.toko,
                    onlyPenjualan: true,
                    excludeRefund: true,
                    excludeTransfer: true,
                    excludePembelian: true,
                    excludeReject: true,
                  },
                }
              );
            }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {item.toko}
                </h3>
                <p className="text-xs text-gray-500">Dashboard Penjualan</p>
              </div>

              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                {index + 1}
              </div>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-3">
              <div className="text-xs font-semibold text-green-700">
                PENJUALAN HARI INI
              </div>
              <div className="text-lg font-bold text-green-600 mt-1">
                {rupiah(item.omzetHariIni)}
              </div>
              <div className="text-[11px] text-green-700 mt-1">
                {item.transaksiHariIni.toLocaleString("id-ID")} transaksi
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-blue-700">
                PENJUALAN BULAN INI
              </div>
              <div className="text-lg font-bold text-blue-600 mt-1">
                {rupiah(item.omzetBulanIni)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {dataToko.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500 mt-4">
          Belum ada data penjualan toko
        </div>
      )}
    </div>
  );
}

export default memo(CardPenjualanToko);
