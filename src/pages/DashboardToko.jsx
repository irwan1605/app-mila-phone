// src/pages/DashboardToko.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  listenAllTransaksi,
  listenMasterBarang,
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
  const [searchStock, setSearchStock] = useState("");
  const { state } = useLocation();
  const tableRef = useRef(null);
  const namaToko = TOKO_AKTIF;

  /* ======================
     STATE
  ====================== */
  const [transaksi, setTransaksi] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  /* ======================
     REALTIME LISTENER
  ====================== */
  useEffect(() => {
    const unsub1 = listenAllTransaksi((rows) => setTransaksi(rows || []));
    const unsub2 = listenMasterBarang((rows) => setMasterBarang(rows || []));

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
    };
  }, []);

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

  // ======================= DRAFT STORAGE (ANTI HILANG SAAT REFRESH) =======================
  const DRAFT_KEY = `DASHBOARD_DRAFT_TOKO_${tokoId}`;

  // Load draft saat pertama render

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

  

  // ======================= SUMMARY DASHBOARD TOKO =======================

  const todayStr = new Date().toISOString().slice(0, 10);

  // 🔥 FILTER HANYA PENJUALAN TOKO INI
  const penjualanToko = useMemo(() => {
    return (transaksiToko || []).filter(
      (x) => String(x.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN"
    );
  }, [transaksiToko]);

  // 1️⃣ INFORMASI OMSET PEMBELIAN STOK
  const totalOmsetPembelian = useMemo(() => {
    return (transaksiToko || [])
      .filter(
        (x) =>
          String(x.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
          String(x.STATUS || "").toUpperCase() === "APPROVED"
      )
      .reduce((s, x) => s + Number(x.TOTAL || x.HARGA_UNIT || 0), 0);
  }, [transaksiToko]);

  // 2️⃣ TOTAL TRANSAKSI BERHASIL (INVOICE UNIK)
  const totalTransaksiBerhasil = useMemo(() => {
    const map = {};
    penjualanToko.forEach((trx) => {
      if (String(trx.STATUS).toUpperCase() !== "APPROVED") return;
      const inv = String(trx.NO_INVOICE || "").trim();
      if (inv) map[inv] = true;
    });
    return Object.keys(map).length;
  }, [penjualanToko]);

  // 3️⃣ TRANSAKSI PENDING
  const totalPending = useMemo(() => {
    return penjualanToko.filter(
      (x) => String(x.STATUS).toUpperCase() === "PENDING"
    ).length;
  }, [penjualanToko]);

  // 4️⃣ PENJUALAN HARI INI
  const totalPenjualanHariIni = useMemo(() => {
    return penjualanToko
      .filter((x) => {
        if (!x.TANGGAL_TRANSAKSI) return false;
        return x.TANGGAL_TRANSAKSI.slice(0, 10) === todayStr;
      })
      .filter((x) => String(x.STATUS).toUpperCase() === "APPROVED")
      .reduce((s, x) => s + Number(x.TOTAL || 0), 0);
  }, [penjualanToko, todayStr]);

  // 5️⃣ TOTAL UNIT TERJUAL
  const totalUnitTerjual = useMemo(() => {
    return penjualanToko.length;
  }, [penjualanToko]);

  // 6️⃣ INFORMASI PIUTANG
  const totalPiutang = useMemo(() => {
    return penjualanToko.filter(
      (x) =>
        String(x.SYSTEM_PAYMENT || "").toUpperCase() === "PIUTANG" &&
        String(x.STATUS || "").toUpperCase() === "APPROVED"
    ).length;
  }, [penjualanToko]);

  /* ======================
     MAP MASTER BARANG
  ====================== */
  const masterMap = useMemo(() => {
    const map = {};
    masterBarang.forEach((b) => {
      if (!b.brand || !b.namaBarang) return;
      const key = `${b.brand}|${b.namaBarang}`;
      map[key] = {
        hargaSRP: Number(b.harga?.srp ?? b.hargaSRP ?? 0),
        hargaGrosir: Number(b.harga?.grosir ?? b.hargaGrosir ?? 0),
        hargaReseller: Number(b.harga?.reseller ?? b.hargaReseller ?? 0),
      };
    });
    return map;
  }, [masterBarang]);

  const imeiFinalMap = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      if (!t || t.STATUS !== "Approved" || !t.IMEI) return;

      const imei = String(t.IMEI).trim();
      const toko = String(t.NAMA_TOKO || "").trim();
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      if (!map[imei]) {
        map[imei] = {
          imei,
          toko: null,
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier: t.NAMA_SUPPLIER || "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          keterangan: "",
        };
      }

      if (metode === "PEMBELIAN") {
        map[imei].toko = toko;
      }

      if (metode === "TRANSFER_MASUK") {
        map[imei].toko = toko;
        map[imei].keterangan = `Transfer masuk ke Toko ${toko}`;
      }

      if (metode === "PENJUALAN") {
        delete map[imei];
      }
    });

    return map;
  }, [transaksi]);

  /* ======================
     BUILD ROWS
  ====================== */
  /* ======================
   BUILD ROWS (FIX FINAL)
====================== */
  /* ======================
   BUILD ROWS (FINAL FIX)
====================== */
  const rows = useMemo(() => {
    if (!namaToko) return [];

    const map = {};

    transaksi.forEach((t) => {
      if (!t) return;

      const status = String(t.STATUS || "").toUpperCase();
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();
      const tokoData = String(t.NAMA_TOKO || "").trim();

      // ✅ hanya transaksi approved & toko ini
      if (status !== "APPROVED") return;
      if (tokoData !== namaToko) return;

      // ======================
      // KEY ITEM
      // ======================
      const key = t.IMEI
        ? `IMEI-${t.IMEI}`
        : `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;

      // ======================
      // HITUNG QTY
      // ======================
      let qty = 0;

      if (["PEMBELIAN", "TRANSFER_MASUK"].includes(metode)) qty = 1;
      if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) qty = -1;

      if (!map[key]) {
        const harga = masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`] || {};

        map[key] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier: t.NAMA_SUPPLIER || "-",
          namaToko: tokoData,
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          imei: t.IMEI || "",
          qty: 0,

          hargaSRP: harga.hargaSRP || 0,
          hargaGrosir: harga.hargaGrosir || 0,
          hargaReseller: harga.hargaReseller || 0,

          statusBarang: "TERSEDIA",
          keterangan: "",
        };
      }

      map[key].qty += qty;
    });

    // ✅ hanya stok yang masih ada
    return Object.values(map).filter((r) => r.qty > 0);
  }, [transaksi, masterMap, namaToko]);

  /* ======================
   SEARCH FILTER
====================== */
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.brand.toLowerCase().includes(q) ||
        r.barang.toLowerCase().includes(q) ||
        r.imei.toLowerCase().includes(q) ||
        r.noDo.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // ======================= DETAIL STOK TOKO =======================

  const detailStockToko = useMemo(() => {
    const map = {};

    (stockToko || []).forEach((x) => {
      const key =
        (x.NAMA_BRAND || "") +
        "|" +
        (x.NAMA_BARANG || "") +
        "|" +
        (x.KATEGORI_BRAND || "");

      if (!map[key]) {
        map[key] = {
          brand: x.NAMA_BRAND,
          barang: x.NAMA_BARANG,
          kategori: x.KATEGORI_BRAND,
          qty: 0,
        };
      }

      // IMEI = 1 unit
      map[key].qty += 1;
    });

    return Object.values(map).sort((a, b) =>
      String(a.brand).localeCompare(String(b.brand))
    );
  }, [stockToko]);

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

  // ======================= FILTER STOCK TABLE =======================
  const filteredStockToko = useMemo(() => {
    const keyword = String(searchStock || "").toLowerCase();

    if (!keyword) return stockToko;

    return stockToko.filter((x) => {
      return (
        String(x.NO_DO || "")
          .toLowerCase()
          .includes(keyword) ||
        String(x.NAMA_BRAND || "")
          .toLowerCase()
          .includes(keyword) ||
        String(x.NAMA_BARANG || "")
          .toLowerCase()
          .includes(keyword) ||
        String(x.IMEI || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [stockToko, searchStock]);

  /* ======================
     PAGINATION
  ====================== */
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ======================
     EXPORT EXCEL
  ====================== */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DetailStock");
    XLSX.writeFile(wb, "Detail_Stock_Semua_Toko.xlsx");
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

      {/* ===================== DETAIL STOK TOKO ===================== */}
      <div className={`${cardBgClass} rounded-2xl shadow-xl mt-10`}>
        {/* HEADER */}
        <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <h2 className="font-semibold text-lg">
            Detail Stok Toko : {toko.tokoName}
          </h2>

          <div className="flex gap-2 w-full md:w-auto">
            <input
              value={searchStock}
              onChange={(e) => setSearchStock(e.target.value)}
              placeholder="Cari NO DO / Brand / Barang / IMEI"
              className="flex-1 md:w-80 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm outline-none"
            />

            <button
              onClick={() => handleOpen("penjualan")}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-green-500 text-white text-sm font-semibold"
            >
              🛒 PENJUALAN
            </button>

            <button
              onClick={() => {
                const ws = XLSX.utils.json_to_sheet(filteredStockToko);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Stock Toko");
                XLSX.writeFile(wb, `STOK_${toko.tokoName}.xlsx`);
              }}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm"
            >
              Export
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="p-4 min-h-screen bg-slate-900 text-white">
          {!namaToko ? (
            <div className="text-red-400 font-semibold">
              ❌ Nama toko tidak ditemukan
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">
                Detail Stok Toko : {namaToko}
              </h2>

              <div
                ref={tableRef}
                className="bg-white/10 p-4 rounded-xl mb-4 flex items-center"
              >
                <FaSearch />
                <input
                  className="ml-3 flex-1 bg-transparent outline-none"
                  placeholder="Cari NO DO / Brand / Barang / IMEI"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                <button
                  onClick={() =>
                    navigate("/toko/:tokoId/penjualan", {
                      state: {
                        namaToko: namaToko,
                        source: "DETAIL_STOCK_TOKO",
                      },
                    })
                  }
                  className="
    flex items-center gap-2
    px-5 py-2 rounded-xl
    bg-gradient-to-r from-red-500 to-emerald-600
    hover:from-emerald-600 hover:to-blue-500
    text-white font-semibold
    shadow-lg hover:shadow-green-400/50
    transition-all duration-200
  "
                >
                  🛒 PENJUALAN
                </button>
                <button
                  onClick={exportExcel}
                  className="ml-4 bg-green-600 px-4 py-2 rounded   bg-gradient-to-r from-green-500 to-emerald-600
    hover:from-emerald-600 hover:to-blue-500
    text-white font-semibold
    shadow-lg hover:shadow-blue-400/50
    transition-all duration-200"
                >
                  Export
                </button>
              </div>

              <div className="bg-white text-slate-800 rounded-2xl shadow-xl overflow-x-auto scrollbar-dark">
                <table className="w-full min-w-[2200px] text-sm">
                  <thead className="bg-blue-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        No
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Tanggal
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        NO DO
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Supplier
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Toko
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Brand
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Barang
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        IMEI
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Harga SRP
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Total SRP
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Harga Grosir
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Total Grosir
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Harga Reseller
                      </th>
                      <th className="px-3 py-2">STATUS</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Total Reseller
                      </th>

                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Keterangan
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginated.map((r, i) => {
                      // ✅ WAJIB ADA DI SINI (DALAM MAP)
                      const totalSRP = r.qty * r.hargaSRP;
                      const totalGrosir = r.qty * r.hargaGrosir;
                      const totalReseller = r.qty * r.hargaReseller;

                      return (
                        <tr key={i} className="border-b border-blue-700">
                          <td className="px-3 py-2 text-center font-mono">
                            {(page - 1) * pageSize + i + 1}
                          </td>

                          <td className="px-3 py-2">{r.tanggal}</td>
                          <td className="px-3 py-2">{r.noDo}</td>
                          <td className="px-3 py-2">{r.supplier}</td>
                          <td className="px-3 py-2">{r.namaToko}</td>
                          <td className="px-3 py-2">{r.brand}</td>
                          <td className="px-3 py-2">{r.barang}</td>
                          <td className="px-3 py-2 font-mono">{r.imei}</td>

                          <td className="px-3 py-2 text-right font-semibold">
                            {r.qty}
                          </td>

                          {/* HARGA SRP */}
                          <td className="px-3 py-2 text-right">
                            {rupiah(r.hargaSRP)}
                          </td>

                          {/* TOTAL SRP */}
                          <td className="px-3 py-2 text-right font-semibold">
                            {rupiah(totalSRP)}
                          </td>

                          {/* HARGA GROSIR */}
                          <td className="px-3 py-2 text-right">
                            {rupiah(r.hargaGrosir)}
                          </td>

                          {/* TOTAL GROSIR */}
                          <td className="px-3 py-2 text-right font-semibold">
                            {rupiah(totalGrosir)}
                          </td>

                          {/* HARGA RESELLER */}
                          <td className="px-3 py-2 text-right">
                            {rupiah(r.hargaReseller)}
                          </td>

                          {/* STATUS */}
                          <td className="px-3 py-2 text-center font-semibold">
                            {r.statusBarang}
                          </td>

                          {/* TOTAL RESELLER */}
                          <td className="px-3 py-2 text-right font-semibold">
                            {rupiah(totalReseller)}
                          </td>

                          <td className="px-3 py-2 text-xs text-gray-500">
                            {r.keterangan || "-"}
                          </td>

                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() =>
                                navigate("/transfer-barang", {
                                  state: { tokoPengirim: namaToko },
                                })
                              }
                              className="px-3 py-1 rounded bg-orange-500 hover:bg-orange-600 text-white text-xs"
                            >
                              Transfer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex justify-between p-4 text-sm">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Prev
                  </button>
                  <span>
                    Page {page} / {pageCount}
                  </span>
                  <button
                    disabled={page === pageCount}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
