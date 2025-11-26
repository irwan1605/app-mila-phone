// src/pages/DashboardToko.jsx

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaStore,
  FaShoppingCart,
  FaBoxes,
  FaExchangeAlt,
} from "react-icons/fa";

// List toko (tanpa PUSAT, CILANGKAP PUSAT jadi pengganti)
const TOKO_LIST = [
  { id: "1", name: "CILANGKAP PUSAT", code: "cilangkap-pusat" },
  { id: "2", name: "CIBINONG", code: "cibinong" },
  { id: "3", name: "GAS ALAM", code: "gas-alam" },
  { id: "4", name: "CITEUREUP", code: "citeureup" },
  { id: "5", name: "CIRACAS", code: "ciracas" },
  { id: "6", name: "METLAND 1", code: "metland-1" },
  { id: "7", name: "METLAND 2", code: "metland-2" },
  { id: "8", name: "PITARA", code: "pitara" },
  { id: "9", name: "KOTA WISATA", code: "kota-wisata" },
  { id: "10", name: "SAWANGAN", code: "sawangan" },
];

export default function DashboardToko(props) {
  const params = useParams();
  // Support dua cara: dari App.jsx pakai prop, atau langsung dari URL
  const tokoId = props.tokoId || params.tokoId || params.id;
  const navigate = useNavigate();

  const toko = TOKO_LIST.find((t) => t.id === String(tokoId));

  if (!toko) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-center">
          <p className="font-semibold text-red-600">Toko tidak ditemukan</p>
          <p className="text-xs text-slate-500 mt-1">
            Pastikan link Sidebar untuk Dashboard Toko menggunakan id 1–10.
          </p>
        </div>
      </div>
    );
  }

  const handleOpen = (type) => {
    // Route: /toko/:tokoId/penjualan | stock-opname | transfer-gudang
    if (type === "penjualan") {
      navigate(`/toko/${toko.id}/penjualan`);
    } else if (type === "stock") {
      navigate(`/toko/${toko.id}/stock-opname`);
    } else if (type === "transfer") {
      navigate(`/toko/${toko.id}/transfer-gudang`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-indigo-100">
                <FaStore className="text-indigo-600" />
              </span>
              <span>Dashboard Toko – {toko.name}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Pilih menu untuk mengelola penjualan, stok, dan transfer gudang
              di toko ini.
            </p>
          </div>
        </div>

        {/* 3 Card utama */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mt-4">
          {/* CARD PENJUALAN */}
          <button
            onClick={() => handleOpen("penjualan")}
            className="group flex flex-col items-start justify-between bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-xs opacity-80">Menu</p>
                <p className="font-semibold text-lg">Penjualan</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <FaShoppingCart className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-sm mt-3 opacity-90">
              Input transaksi penjualan, data user, pembayaran, dan kategori
              barang lengkap dengan invoice.
            </p>
          </button>

          {/* CARD STOCK OPNAME */}
          <button
            onClick={() => handleOpen("stock")}
            className="group flex flex-col items-start justify-between bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-xs opacity-80">Menu</p>
                <p className="font-semibold text-lg">Stock Opname</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <FaBoxes className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-sm mt-3 opacity-90">
              Lakukan pengecekan stok fisik vs sistem dan update hasil
              perhitungan untuk toko ini.
            </p>
          </button>

          {/* CARD TRANSFER GUDANG */}
          <button
            onClick={() => handleOpen("transfer")}
            className="group flex flex-col items-start justify-between bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl p-5 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-xs opacity-80">Menu</p>
                <p className="font-semibold text-lg">Transfer Gudang</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <FaExchangeAlt className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-sm mt-3 opacity-90">
              Catat dan kelola mutasi barang antar toko atau ke gudang pusat
              secara terkontrol.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
