// src/pages/DashboardToko.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaStore,
  FaShoppingCart,
  FaBoxes,
  FaExchangeAlt,
  FaSun,
  FaMoon,
  FaSearch,
} from "react-icons/fa";

import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

import {
  listenPenjualanHemat,
  listenTransaksiByTokoHemat,
} from "../services/FirebaseService";

import * as XLSX from "xlsx";

const userLogin = JSON.parse(localStorage.getItem("userLogin") || "{}");

// ======================= KONSTAN =======================
const TOKO_LIST = [
  { id: "1", tokoName: "CILANGKAP PUSAT", code: "cilangkap-pusat" },
  { id: "2", tokoName: "CIBINONG", code: "cibinong" },
  { id: "3", tokoName: "GAS ALAM", code: "gas-alam" },
  { id: "4", tokoName: "CITEUREUP", code: "citeureup" },
  { id: "5", tokoName: "CIRACAS", code: "ciracas" },
  { id: "6", tokoName: "METLAND 1", code: "metland-1" },
  { id: "7", tokoName: "METLAND 2", code: "metland-2" },
  { id: "8", tokoName: "PITARA", code: "pitara" },
  { id: "9", tokoName: "KOTA WISATA", code: "kota-wisata" },
  { id: "10", tokoName: "SAWANGAN", code: "sawangan" },
];

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

// ✅ KEY UNTUK SIMPAN TEMA
const THEME_KEY = "DASHBOARD_TOKO_THEME";

export default function DashboardToko(props) {
  const params = useParams();
  const tokoId = props.tokoId || params.tokoId || params.id;
  const navigate = useNavigate();
  // ======================= ROLE USER =======================
  const roleUser = localStorage.getItem("ROLE_USER");
  const isPicToko = roleUser === "PIC_TOKO";

  const toko = TOKO_LIST.find((t) => t.id === String(tokoId));
  const TOKO_AKTIF = toko?.tokoName || "";

  const MAP_TOKO = {
    1: "-OhxxxxCILANGKAP",
    2: "-OhxxxxCIBINONG",
    3: "-OhxxxxGASALAM",
    4: "-OhxxxxCITEUREUP",
    5: "-OhxxxxCIRACAS",
    6: "-OhxxxxMETLAND1",
    7: "-OhWcqjXukQ2kZ8SGwUV", // METLAND 2
    8: "-OhxxxxPITARA",
    9: "-OhxxxxKOTAWISATA",
    10: "-OhxxxxSAWANGAN",
  };

  const firebaseTokoId = MAP_TOKO[userLogin.toko] || MAP_TOKO[tokoId];

  // ✅ SIMPAN TOKO LOGIN & ROLE (UNTUK TRANSFER BARANG)
  useEffect(() => {
    if (toko?.tokoName) {
      localStorage.setItem("TOKO_LOGIN", toko.tokoName);
      localStorage.setItem(
        "ROLE_USER",
        localStorage.getItem("ROLE_USER") || "USER"
      );
    }
  }, [toko]);

  // ======================= STATE GLOBAL =======================
  // ✅ DEFAULT LIGHT MODE (false) + akan dioverride oleh localStorage
  const [isDark, setIsDark] = useState(false);

  // ✅ LIST GLOBAL (HEMAT) UNTUK CHART PENJUALAN & STOK PER TOKO
  const [allTransaksi, setAllTransaksi] = useState([]);

  // ✅ LIST KHUSUS TOKO INI (HEMAT) UNTUK IMEI, VOID, RETURN
  const [transaksiToko, setTransaksiToko] = useState([]);
  const [stockToko, setStockToko] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    if (!firebaseTokoId) return;

    const dbRef = ref(db, `toko/${firebaseTokoId}/transaksi`);

    const unsub = onValue(dbRef, (snap) => {
      if (!snap.exists()) {
        setStockToko([]);
        setLoadingStock(false);
        return;
      }

      const raw = snap.val();
      const rows = Object.values(raw);

      // 🔥 FILTER STOK REAL
      const stokAktif = rows.filter((x) => {
        const status = String(x.STATUS || "").toUpperCase();
        const metode = String(x.PAYMENT_METODE || "").toUpperCase();

        return metode === "PEMBELIAN" && status === "APPROVED";
      });

      setStockToko(stokAktif);
      setLoadingStock(false);
    });

    return () => unsub();
  }, [firebaseTokoId]);

  // ======================= LAPORAN VOID & RETURN =======================
  const [laporanVoid, setLaporanVoid] = useState([]);
  const [laporanReturn, setLaporanReturn] = useState([]);

  // Penjualan cepat via IMEI
  const [searchImei, setSearchImei] = useState("");
  const [quickItems, setQuickItems] = useState([]);

  // ✅ PAGINATION TABLE PENJUALAN
  const [page, setPage] = useState(1);
  const perPage = 10;

  const totalPage = useMemo(
    () => Math.max(1, Math.ceil((quickItems || []).length / perPage)),
    [quickItems, perPage]
  );

  // ======================= CHART VOID & RETURN PER TOKO =======================
  // eslint-disable-next-line no-unused-vars
  const dataChartVoidReturn = useMemo(() => {
    const map = {};
    TOKO_LIST.forEach((t) => {
      map[t.tokoName] = { VOID: 0, RETURN: 0 };
    });

    (allTransaksi || []).forEach((x) => {
      const tokoName = x.NAMA_TOKO;
      const total = Number(x.TOTAL || x.HARGA_UNIT || 0);

      if (!map[tokoName]) return;

      if ((x.STATUS || "").toUpperCase() === "VOID") {
        map[tokoName].VOID += total;
      }

      if ((x.STATUS || "").toUpperCase() === "RETURN") {
        map[tokoName].RETURN += total;
      }
    });

    return Object.entries(map).map(([tokoName, val]) => ({
      tokoName,
      VOID: val.VOID,
      RETURN: val.RETURN,
    }));
  }, [allTransaksi]);

  const exportVoidExcel = () => {
    const ws = XLSX.utils.json_to_sheet(laporanVoidExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan VOID");
    XLSX.writeFile(wb, `Laporan_VOID_${toko?.tokoName}.xlsx`);
  };

  const exportReturnExcel = () => {
    const ws = XLSX.utils.json_to_sheet(laporanReturnExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan RETURN");
    XLSX.writeFile(wb, `Laporan_RETURN_${toko?.tokoName}.xlsx`);
  };

  useEffect(() => {
    // kalau jumlah data berubah & page jadi kebesaran, turunkan ke max
    if (page > totalPage) setPage(totalPage);
  }, [totalPage, page]);

  const [paymentType, setPaymentType] = useState(""); // "CASH" | "TRANSFER" | "KREDIT"
  const [creditForm, setCreditForm] = useState({
    paymentMethod: "",
    mdr: "",
    kategoriHarga: "",
    mpProtec: "",
    tenor: "",
  });

  // ======================= DRAFT STORAGE (ANTI HILANG SAAT REFRESH) =======================
  const DRAFT_KEY = `DASHBOARD_DRAFT_TOKO_${tokoId}`;

  // Load draft saat pertama render
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setQuickItems(parsed.quickItems || []);
        setPaymentType(parsed.paymentType || "");
        setCreditForm(
          parsed.creditForm || {
            paymentMethod: "",
            mdr: "",
            kategoriHarga: "",
            mpProtec: "",
            tenor: "",
          }
        );
      } catch {}
    }
  }, [DRAFT_KEY]);

  useEffect(() => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        quickItems,
        paymentType,
        creditForm,
      })
    );
  }, [DRAFT_KEY, quickItems, paymentType, creditForm]);

  // Simpan draft setiap ada perubahan
  useEffect(() => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        quickItems,
        paymentType,
        creditForm,
      })
    );
  }, [DRAFT_KEY, quickItems, paymentType, creditForm]);

  // ======================= THEME PERSIST (TIDAK BERUBAH SAAT REFRESH) =======================
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark") setIsDark(true);
    if (savedTheme === "light") setIsDark(false);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  // ======================= LISTENER FIREBASE (HEMAT KUOTA) =======================
  useEffect(() => {
    // ✅ Listener GLOBAL hemat: untuk chart & laporan antar toko
    const unsubGlobal =
      typeof listenPenjualanHemat === "function"
        ? listenPenjualanHemat(
            (list) => {
              setAllTransaksi(Array.isArray(list) ? list : []);
            },
            {
              // bisa kamu sesuaikan:
              limit: 500, // ambil 500 transaksi terakhir secara global
            }
          )
        : null;

    // ✅ Listener KHUSUS TOKO: untuk VOID, RETURN & IMEI stok toko ini
    const unsubToko =
      typeof listenTransaksiByTokoHemat === "function" && tokoId
        ? listenTransaksiByTokoHemat(
            tokoId,
            {
              limit: 500, // ambil 500 transaksi terakhir toko ini
            },
            (list) => {
              setTransaksiToko(Array.isArray(list) ? list : []);
            }
          )
        : null;

    return () => {
      unsubGlobal && unsubGlobal();
      unsubToko && unsubToko();
    };
  }, [tokoId]);

  // ======================= FILTER REALTIME VOID & RETURN (KHUSUS TOKO INI) =======================
  const dataVoidRealtime = useMemo(() => {
    return (transaksiToko || []).filter(
      (x) =>
        (x.STATUS || "").toUpperCase() === "VOID" &&
        (x.PAYMENT_METODE || "").toUpperCase().includes("PENJUALAN") &&
        x.NAMA_TOKO === (toko ? toko.tokoName : "")
    );
  }, [transaksiToko, toko]);

  const dataReturnRealtime = useMemo(() => {
    return (transaksiToko || []).filter(
      (x) =>
        (x.STATUS || "").toUpperCase() === "RETURN" &&
        (x.PAYMENT_METODE || "").toUpperCase().includes("PENJUALAN") &&
        x.NAMA_TOKO === (toko ? toko.tokoName : "")
    );
  }, [transaksiToko, toko]);

  useEffect(() => {
    setLaporanVoid(dataVoidRealtime);
    setLaporanReturn(dataReturnRealtime);
  }, [dataVoidRealtime, dataReturnRealtime]);

  // eslint-disable-next-line no-unused-vars
  const totalVoid = useMemo(() => {
    return laporanVoid.reduce(
      (sum, x) => sum + Number(x.TOTAL || x.HARGA_UNIT || 0),
      0
    );
  }, [laporanVoid]);

  // eslint-disable-next-line no-unused-vars
  const totalReturn = useMemo(() => {
    return laporanReturn.reduce(
      (sum, x) => sum + Number(x.TOTAL || x.HARGA_UNIT || 0),
      0
    );
  }, [laporanReturn]);

  // eslint-disable-next-line no-unused-vars
  const laporanVoidExport = useMemo(() => {
    return (laporanVoid || []).map((x, i) => ({
      No: i + 1,
      Tanggal: x.TANGGAL_TRANSAKSI,
      Invoice: x.NO_INVOICE,
      Brand: x.NAMA_BRAND,
      Barang: x.NAMA_BARANG,
      IMEI: x.IMEI,
      Harga: x.HARGA_UNIT,
      Status: x.STATUS,
      Toko: x.NAMA_TOKO,
    }));
  }, [laporanVoid]);

  // eslint-disable-next-line no-unused-vars
  const laporanReturnExport = useMemo(() => {
    return (laporanReturn || []).map((x, i) => ({
      No: i + 1,
      Tanggal: x.TANGGAL_TRANSAKSI,
      Invoice: x.NO_INVOICE,
      Brand: x.NAMA_BRAND,
      Barang: x.NAMA_BARANG,
      IMEI: x.IMEI,
      Harga: x.HARGA_UNIT,
      Status: x.STATUS,
      Toko: x.NAMA_TOKO,
    }));
  }, [laporanReturn]);

  // ======================= HANDLER =======================

  /* ================= HANDLER ================= */

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleOpen = (type) => {
    if (!toko) return;

    const tokoSlug =
      toko.code || (toko.tokoName || "").toLowerCase().replace(/\s+/g, "-");

    if (type === "penjualan") {
      navigate(`/toko/${tokoSlug}/penjualan`);
    } else if (type === "stock") {
      navigate("/stok-opname", {
        state: { lockedToko: toko.tokoName },
      });
    } else if (type === "transfer") {
      navigate("/transfer-barang");
    }
  };

  console.log("🔥 FIREBASE TOKO ID:", firebaseTokoId);

  /* ============================
      🔥 PENJUALAN CEPAT IMEI
  ============================ */
  const handleSearchImei = () => {
    const input = String(searchImei).trim();
    if (!input) return alert("Masukan IMEI");
    if (loadingStock) return alert("⏳ Loading data...");
  
    const imeiFound = stockToko.find(
      (x) => String(x.IMEI || "").trim() === input
    );
  
    if (!imeiFound) {
      alert(`❌ IMEI ${input} tidak ditemukan`);
      return;
    }
  
    navigate(`/toko/${toko.code}/penjualan`, {
      state: {
        fastSale: true,
        imeiData: {
          toko: TOKO_AKTIF,
          kategoriBarang: imeiFound.KATEGORI_BRAND,
          namaBrand: imeiFound.NAMA_BRAND,
          namaBarang: imeiFound.NAMA_BARANG,
          imei: imeiFound.IMEI,
  
          hargaMap: {
            srp: Number(imeiFound.HARGA_SRP || imeiFound.HARGA_UNIT || 0),
            grosir: Number(imeiFound.HARGA_GROSIR || 0),
            reseller: Number(imeiFound.HARGA_RESELLER || 0),
          },
        },
      },
    });
  };
  

  // ======================= HANDLE TIDAK ADA TOKO =======================
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

  // ======================= UI =======================
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

      {/* ===================== TABEL LAPORAN VOID & RETURN ===================== */}
      <div
        className={`${cardBgClass} rounded-2xl shadow-xl p-4 sm:p-5 backdrop-blur-xl mt-10`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <h2 className="font-semibold text-base sm:text-lg">
            Laporan VOID & RETURN Realtime
          </h2>
          <div className="flex gap-2">
            <button
              onClick={exportVoidExcel}
              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs"
            >
              Export VOID
            </button>
            <button
              onClick={exportReturnExcel}
              className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs"
            >
              Export RETURN
            </button>
          </div>
        </div>

        {/* ===== TABLE VOID ===== */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm mb-2 text-red-400">
            Tabel VOID
          </h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs">
              <thead className={isDark ? "bg-slate-900" : "bg-slate-100"}>
                <tr>
                  <th className="p-2">Tanggal</th>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Brand</th>
                  <th className="p-2">Barang</th>
                  <th className="p-2">IMEI</th>
                  <th className="p-2">Harga</th>
                </tr>
              </thead>
              <tbody>
                {laporanVoid.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-3">
                      Tidak ada data VOID
                    </td>
                  </tr>
                ) : (
                  laporanVoid.map((x, i) => (
                    <tr key={i}>
                      <td className="p-2">{x.TANGGAL_TRANSAKSI}</td>
                      <td className="p-2">{x.NO_INVOICE}</td>
                      <td className="p-2">{x.NAMA_BRAND}</td>
                      <td className="p-2">{x.NAMA_BARANG}</td>
                      <td className="p-2 font-mono">{x.IMEI}</td>
                      <td className="p-2 text-right">Rp {fmt(x.HARGA_UNIT)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== TABLE RETURN ===== */}
        <div>
          <h3 className="font-semibold text-sm mb-2 text-amber-400">
            Tabel RETURN
          </h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs">
              <thead className={isDark ? "bg-slate-900" : "bg-slate-100"}>
                <tr>
                  <th className="p-2">Tanggal</th>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Brand</th>
                  <th className="p-2">Barang</th>
                  <th className="p-2">IMEI</th>
                  <th className="p-2">Harga</th>
                </tr>
              </thead>
              <tbody>
                {laporanReturn.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-3">
                      Tidak ada data RETURN
                    </td>
                  </tr>
                ) : (
                  laporanReturn.map((x, i) => (
                    <tr key={i}>
                      <td className="p-2">{x.TANGGAL_TRANSAKSI}</td>
                      <td className="p-2">{x.NO_INVOICE}</td>
                      <td className="p-2">{x.NAMA_BRAND}</td>
                      <td className="p-2">{x.NAMA_BARANG}</td>
                      <td className="p-2 font-mono">{x.IMEI}</td>
                      <td className="p-2 text-right">Rp {fmt(x.HARGA_UNIT)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
