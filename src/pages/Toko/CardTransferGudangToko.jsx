// src/pages/Toko/CardTransferGudangToko.jsx

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaExchangeAlt } from "react-icons/fa";

const tokoNameFromId = (id) =>
  ({
    "1": "CILANGKAP PUSAT",
    "2": "CIBINONG",
    "3": "GAS ALAM",
    "4": "CITEUREUP",
    "5": "CIRACAS",
    "6": "METLAND 1",
    "7": "METLAND 2",
    "8": "PITARA",
    "9": "KOTA WISATA",
    "10": "SAWANGAN",
  }[String(id)] || `TOKO ${id}`);

export default function CardTransferGudangToko() {
  const { tokoId } = useParams();
  const navigate = useNavigate();
  const tokoName = tokoNameFromId(tokoId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              Transfer Gudang – {tokoName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Modul perencanaan mutasi barang antar toko / gudang. Bisa
              diintegrasikan ke fungsi transferStock & createTransferRequest.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
            <FaExchangeAlt className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Rencana Integrasi Transfer Stok
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Di sini nanti bisa dibuat form pilih toko asal, toko tujuan,
              barang, dan QTY; lalu disimpan ke Firebase sebagai permintaan
              transfer gudang.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
