// src/pages/DashboardToko.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaStore,
  FaShoppingCart,
  FaBoxes,
  FaExchangeAlt,
  FaSun,
  FaMoon,
  FaSearch,
  FaFileExcel,
  FaCashRegister,
} from "react-icons/fa";

import DetailStockToko from "./table/DetailStockToko";

// ======================= KONSTAN =======================
const TOKO_LIST = [
  { id: "1", tokoName: "CILANGKAP PUSAT", code: "cilangkap-pusat" },
  { id: "2", tokoName: "CIBINONG", code: "cibinong" },
  { id: "3", tokoName: "GAS ALAM", code: "gas-alam" },
  { id: "4", tokoName: "CITEUREUP", code: "citeureup" },
  { id: "5", tokoName: "MARKETPLACE", code: "marketplace" },
  { id: "6", tokoName: "METLAND 1", code: "metland-1" },
  { id: "7", tokoName: "METLAND 2", code: "metland-2" },
  { id: "8", tokoName: "PITARA", code: "pitara" },
  { id: "9", tokoName: "KOTA WISATA", code: "kota-wisata" },
  { id: "10", tokoName: "SAWANGAN", code: "sawangan" },
  { id: "11", tokoName: "BENGKEL", code: "bengkel" },
];

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

// âœ… KEY UNTUK SIMPAN TEMA
const THEME_KEY = "DASHBOARD_TOKO_THEME";

/* ======================
   HELPER RUPIAH
====================== */
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

export default function DashboardToko(props) {
  const params = useParams();
  const tokoId = props.tokoId || params.tokoId || params.id;
  const navigate = useNavigate();
  const { state } = useLocation();
  const roleUser = localStorage.getItem("ROLE_USER");
  const isPicToko = roleUser === "PIC_TOKO";
  const toko = TOKO_LIST.find((item) => item.id === String(tokoId));
  const TOKO_AKTIF = toko?.tokoName || "";

  useEffect(() => {
    if (!toko?.tokoName) return;
    localStorage.setItem("TOKO_LOGIN", toko.tokoName);
    localStorage.setItem("ROLE_USER", localStorage.getItem("ROLE_USER") || "USER");
  }, [toko?.tokoName]);

  const [isDark, setIsDark] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [exportSignal, setExportSignal] = useState(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark") setIsDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const handleToggleTheme = () => setIsDark((previous) => !previous);

  const handleOpen = (type) => {
    if (!toko) return;
    const tokoSlug = toko.code || toko.tokoName.toLowerCase().replace(/\s+/g, "-");
    if (type === "penjualan") navigate(`/toko/${tokoSlug}/penjualan`);
    if (type === "stock") navigate("/stok-opname", { state: { lockedToko: toko.tokoName } });
    if (type === "transfer") navigate("/transfer-barang");
  };

  if (!toko) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-center">
          <p className="font-semibold text-red-600">Toko tidak ditemukan</p>
          <p className="text-xs text-slate-500 mt-1">Pastikan link Sidebar untuk Dashboard Toko menggunakan id 1–11.</p>
        </div>
      </div>
    );
  }

  const rootBgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100"
    : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900";
  const cardBgClass = isDark
    ? "bg-slate-900/70 border border-slate-700/80 text-slate-100"
    : "bg-white border border-slate-200 text-slate-900";

  return (
    <div className={`min-h-screen ${rootBgClass} p-4 sm:p-6`}>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/40 text-xs text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Store Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight">
              <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 shadow-lg shadow-indigo-500/30">
                <FaStore className="text-indigo-300 text-xl" />
              </span>
              <span>
                Dashboard Toko
                <span className="block text-sm font-semibold text-slate-300">
                  {toko.tokoName}
                </span>
              </span>
            </h1>
          </div>

          {/* ================= FAST SALE IMEI ================= */}
          {/* <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-2">
            <FaSearch className="text-gray-400" /> 
            <input
              type="text"
              value={searchImei}
              onChange={(e) => setSearchImei(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="Cari IMEI..."
            />
            <button
              onClick={handleSearchImei}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded"
            >
              Proses Penjualan
            </button>
          </div> */}

          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={handleToggleTheme}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/60 border border-slate-700/70 shadow-lg shadow-black/40 text-xs hover:scale-105 transition"
            >
              {isDark ? (
                <>
                  <FaSun className="text-yellow-300" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <FaMoon className="text-indigo-500" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>

            <div
              className={`px-3 py-2 rounded-xl ${
                isDark
                  ? "bg-slate-900/60 border-slate-700/80"
                  : "bg-white border-slate-200"
              } border text-xs sm:text-sm flex flex-col items-end shadow-lg`}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Nama Toko ID
              </span>
              <span className="font-semibold">{toko.tokoName}</span>
            </div>
          </div>
        </div>

        {/* ================= 3 MENU CARD ================= */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mt-2 sm:mt-4">
          {/* PENJUALAN */}
          <button
            onClick={() => handleOpen("penjualan")}
            className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white rounded-2xl p-5 shadow-xl shadow-indigo-900/40 border border-white/10 hover:border-indigo-300/60 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all" />
            <div className="flex items-center justify-between w-full relative">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                  Menu
                </p>
                <p className="font-semibold text-lg mt-1">Penjualan</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                <FaShoppingCart className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-3 opacity-90">
              Input transaksi penjualan lengkap dengan invoice dan approval.
            </p>
          </button>

          {/* STOCK OPNAME */}
          {!isPicToko && (
            <button
              onClick={() => handleOpen("stock")}
              className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl p-5 shadow-xl shadow-emerald-900/40 border border-white/10 hover:border-emerald-300/60 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
            >
              <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all" />
              <div className="flex items-center justify-between w-full relative">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                    Menu
                  </p>
                  <p className="font-semibold text-lg mt-1">Stock Opname</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                  <FaBoxes className="text-white text-2xl" />
                </div>
              </div>
              <p className="text-xs sm:text-sm mt-3 opacity-90">
                Cek dan sesuaikan stok fisik dengan sistem secara berkala.
              </p>
            </button>
          )}

          {/* TRANSFER GUDANG */}
          <button
            onClick={() => handleOpen("transfer")}
            className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl p-5 shadow-xl shadow-amber-900/40 border border-white/10 hover:border-amber-300/70 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/25 transition-all" />
            <div className="flex items-center justify-between w-full relative">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                  Menu
                </p>
                <p className="font-semibold text-lg mt-1">Transfer Gudang</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                <FaExchangeAlt className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-3 opacity-90">
              Pindahkan stok antar toko atau ke gudang pusat dengan kontrol.
            </p>
          </button>
        </div>
      </div>

      {/* ===================== DETAIL STOCK UNIVERSAL ===================== */}
      <div
        className={`
          ${cardBgClass}
          rounded-3xl
          shadow-2xl
          mt-10
          overflow-hidden
          border
          ${
            isDark
              ? "border-slate-700 bg-slate-900/80"
              : "border-slate-200 bg-white"
          }
        `}
      >
        {/* HEADER */}
        <div
          className={`
            flex flex-col md:flex-row
            md:items-center
            md:justify-between
            gap-4
            px-6
            py-5
            border-b
            ${
              isDark
                ? "border-slate-700 bg-slate-800/70"
                : "border-slate-200 bg-slate-50"
            }
          `}
        >
          <div>
            <h2
              className={`
                text-2xl font-bold tracking-tight
                ${isDark ? "text-white" : "text-slate-800"}
              `}
            >
              DETAIL STOCK TOKO
            </h2>

            <p
              className={`
                text-sm mt-1
                ${isDark ? "text-slate-400" : "text-slate-500"}
              `}
            >
              Monitoring realtime stock universal semua transaksi
            </p>
          </div>

          <div
            className={`
              px-4 py-2 rounded-2xl font-semibold text-sm
              ${
                isDark
                  ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30"
                  : "bg-indigo-100 text-indigo-700 border border-indigo-200"
              }
            `}
          >
            {TOKO_AKTIF}
          </div>
        </div>

        {/* ======================================
ðŸ”¥ HEADER CONTROL
====================================== */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* SEARCH */}
            <div className="relative flex-1">
              <FaSearch
                className="
          absolute
          left-5
          top-1/2
          -translate-y-1/2
          text-slate-400
        "
              />

              <input
                type="text"
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                placeholder="Cari IMEI / Barang / Toko / Brand / NO DO / Tanggal"
                className="
          w-full
          pl-14
          pr-5
          py-4
          rounded-2xl
          outline-none
          border
          bg-slate-800
          border-slate-700
          text-white
          placeholder-slate-400
          shadow-lg
        "
              />
            </div>

            {/* ACTION BUTTON */}
            <div className="flex items-center gap-3">
              {/* PENJUALAN */}
              <button
                onClick={() => navigate("/penjualan")}
                className="
          flex
          items-center
          gap-2
          px-6
          py-4
          rounded-2xl
          font-bold
          text-white
          shadow-xl
          bg-gradient-to-r
          from-red-500
          to-emerald-500
          hover:scale-105
          transition-all
        "
              >
                <FaCashRegister />
                PENJUALAN
              </button>

              {/* EXPORT */}
              <button
                onClick={() => setExportSignal((value) => value + 1)}
                className="
          flex
          items-center
          gap-2
          px-6
          py-4
          rounded-2xl
          font-bold
          text-white
          shadow-xl
          bg-emerald-500
          hover:bg-emerald-600
          hover:scale-105
          transition-all
        "
              >
                <FaFileExcel />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-0">
          <DetailStockToko
            mode="dashboard"
            searchTerm={dashboardSearch}
            exportSignal={exportSignal}
            namaToko={isPicToko ? TOKO_AKTIF : state?.namaToko || TOKO_AKTIF}
          />
        </div>
      </div>
    </div>
  );
}
