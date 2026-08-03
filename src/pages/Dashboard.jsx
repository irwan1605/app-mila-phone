// src/pages/Dashboard.jsx — DASHBOARD PUSAT CILANGKAP PUSAT
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFileExcel,
  FaFilter,
  FaSearch,
  FaStore,
  FaExchangeAlt,
  FaClipboardList,
  FaMoneyBillWave,
  FaBoxes,
  FaClock,
  FaHandHoldingUsd,
} from "react-icons/fa";

import * as XLSX from "xlsx";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import CardPenjualanToko from "../features/dashboad/CardPenjualanToko";

import {
  forceDeleteTransaksi,
} from "../services/FirebaseService";
import {
  listenAllTransaksiCached,
  listenPenjualanCached,
  listenStockAllCached,
} from "../services/FirebaseCache";

// 🔥 TAMBAHKAN DISINI
const TOKO_LIST = [
  "CILANGKAP PUSAT",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "MARKETPLACE",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
  "BENGKEL",
];

export default function Dashboard() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [dataTransaksi, setDataTransaksi] = useState([]);
  const [stokMaster, setStokMaster] = useState([]);

  const [tokoList, setTokoList] = useState([]);
  const [salesList, setSalesList] = useState([]);

  const [filterType, setFilterType] = useState("semua");
  const [filterValue, setFilterValue] = useState("");
  const [filterToko, setFilterToko] = useState("semua");
  const [filterSales, setFilterSales] = useState("semua");
  const DEV = process.env.NODE_ENV === "development";
  const [searchImei, setSearchImei] = useState("");

  const [stockData, setStockData] = useState({});
  const [transaksi, setTransaksi] = useState([]);
  const [penjualan, setPenjualan] = useState([]);

  const [penjualanList, setPenjualanList] = useState([]);

  // =====================================
  // GLOBAL REFUND CHECK
  // =====================================
  const isRefundTransaction = (trx = {}) => {
    const invoice = String(trx?.invoice || trx?.NO_INVOICE || "")
      .trim()
      .toUpperCase();

    return (
      trx?.deleted === true ||
      trx?.deletedFromPenjualan === true ||
      trx?.refundProcessed === true ||
      trx?.refundLocked === true ||
      trx?.IS_REFUND === true ||
      trx?.HIDE_FROM_PENJUALAN === true ||
      trx?.HIDE_FROM_TABLE === true ||
      String(trx?.STATUS || "").toUpperCase() === "REFUND" ||
      String(trx?.STATUS || "").toUpperCase() === "REFUND_DELETED" ||
      String(trx?.statusPembayaran || "").toUpperCase() === "REFUND" ||
      String(trx?.PAYMENT_METODE || "").toUpperCase() === "REFUND" ||
      invoice.startsWith("REF-")
    );
  };

  const isValidPenjualan = (trx = {}) => {
    const invoice = String(trx?.invoice || trx?.NO_INVOICE || "")
      .trim()
      .toUpperCase();

    const status = String(
      trx?.STATUS || trx?.status || trx?.statusPembayaran || ""
    )
      .trim()
      .toUpperCase();

    const metode = String(
      trx?.PAYMENT_METODE || trx?.paymentMetode || trx?.paymentMetodeUser || ""
    )
      .trim()
      .toUpperCase();

    const toko = String(trx?.NAMA_TOKO || trx?.TOKO || trx?.toko || "")
      .trim()
      .toUpperCase();

    const isRefund =
      trx?.deleted === true ||
      trx?.deletedFromPenjualan === true ||
      trx?.refundProcessed === true ||
      trx?.refundLocked === true ||
      trx?.IS_REFUND === true ||
      trx?.HIDE_FROM_PENJUALAN === true ||
      trx?.HIDE_FROM_TABLE === true ||
      status === "REFUND" ||
      status === "REFUND_DELETED" ||
      metode === "REFUND" ||
      invoice.startsWith("REF-");

    if (isRefund) return false;

    if (metode === "PEMBELIAN") return false;
    if (metode === "TRANSFER") return false;
    if (status === "TRANSFER") return false;
    if (status === "REJECT") return false;
    if (status === "REJEK") return false;
    if (status === "DITOLAK") return false;
    if (status === "VOID") return false;

    return true;
  };

  useEffect(() => {
    const unsub = listenPenjualanCached((data) => {
      if (DEV) {
        console.log("🔥 DATA PENJUALAN DARI listenPenjualan:", data);
      }
      setPenjualanList(Array.isArray(data) ? data : []);
    });

    return () => unsub && unsub();
  }, []);
  if (DEV) {
    console.log("DATA PENJUALAN:", penjualanList);
  }
  // ================== DASHBOARD PENJUALAN (SUMBER: TABLE PENJUALAN) ==================
  // ================= DASHBOARD DARI DATA TRANSAKSI PENJUALAN =================
  const todayStr = new Date().toISOString().slice(0, 10);

  // Satu agregasi untuk seluruh KPI penjualan. Dengan begitu satu snapshot
  // Firebase tidak dipindai ulang oleh setiap card dan komponen anak.
  const dashboardSummary = useMemo(() => {
    const now = new Date();
    const todayLocal = now.toLocaleDateString("en-CA");
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const invoiceHari = new Set();
    const invoiceBulan = new Set();
    const invoiceHariToko = new Set();
    const invoiceBulanToko = new Set();
    const invoicePiutang = new Set();
    let totalNominalHariIni = 0;
    let totalNominalBulanIni = 0;
    let totalBarangTerjualBulanIni = 0;
    const tokoMap = Object.fromEntries(
      TOKO_LIST.map((toko) => [
        toko,
        {
          toko,
          omzetHariIni: 0,
          omzetBulanIni: 0,
          transaksiHariIni: 0,
          transaksiBulanIni: 0,
        },
      ])
    );

    for (const trx of penjualanList) {
      if (!isValidPenjualan(trx)) continue;

      const invoice = String(
        trx?.invoice || trx?.NO_INVOICE || trx?.noInvoice || ""
      ).trim();
      if (!invoice) continue;

      const rawDate = trx?.tanggal || trx?.createdAt || trx?.TANGGAL_TRANSAKSI;
      if (!rawDate) continue;
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) continue;

      const tanggal = date.toLocaleDateString("en-CA");
      const toko = String(trx?.toko || trx?.NAMA_TOKO || trx?.TOKO || "")
        .trim()
        .toUpperCase();
      const total =
        Number(trx?.payment?.grandTotal || 0) ||
        Number(trx?.GRAND_TOTAL || 0) ||
        (Array.isArray(trx?.items)
          ? trx.items.reduce(
              (sum, item) =>
                sum + Number(item.qty || 0) * Number(item.hargaAktif || 0),
              0
            ) + Number(trx?.payment?.nominalMdr || 0)
          : Number(trx?.TOTAL || 0));
      const qty = Array.isArray(trx?.items)
        ? trx.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
        : Number(trx?.QTY || trx?.qty || 1);
      const key = `${toko}|${invoice}`;

      const isPiutang =
        String(trx?.SYSTEM_PAYMENT || "").toUpperCase() === "PIUTANG" ||
        String(trx?.systemPayment || "").toUpperCase() === "PIUTANG" ||
        String(trx?.paymentMethod || "").toUpperCase() === "KREDIT" ||
        String(trx?.PAYMENT_METODE || "").toUpperCase() === "KREDIT";
      if (isPiutang) invoicePiutang.add(invoice);

      if (tanggal === todayLocal) {
        if (!invoiceHari.has(invoice)) {
          invoiceHari.add(invoice);
          totalNominalHariIni += total;
        }
        if (tokoMap[toko] && !invoiceHariToko.has(key)) {
          invoiceHariToko.add(key);
          tokoMap[toko].omzetHariIni += total;
          tokoMap[toko].transaksiHariIni += 1;
        }
      }

      if (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      ) {
        if (!invoiceBulan.has(invoice)) {
          invoiceBulan.add(invoice);
          totalNominalBulanIni += total;
          totalBarangTerjualBulanIni += qty;
        }
        if (tokoMap[toko] && !invoiceBulanToko.has(key)) {
          invoiceBulanToko.add(key);
          tokoMap[toko].omzetBulanIni += total;
          tokoMap[toko].transaksiBulanIni += qty;
        }
      }
    }

    const dataToko = Object.values(tokoMap).sort(
      (a, b) => b.omzetBulanIni - a.omzetBulanIni
    );

    return {
      totalTransaksiHariIni: invoiceHari.size,
      totalNominalHariIni,
      totalNominalBulanIni,
      totalBarangTerjualBulanIni,
      totalPiutangAktif: invoicePiutang.size,
      dataToko,
    };
  }, [penjualanList]);

  /* ================= LISTENER ================= */

  useEffect(() => {
    const u1 = listenStockAllCached((s) => {
      setStockData(s || {});
      setStokMaster(Array.isArray(s) ? s : []);
    });

    return () => {
      u1 && u1();
    };
  }, []);

  useEffect(() => {
    // 🔥 HAPUS TRANSAKSI LEGACY DARI TOKO 1
    forceDeleteTransaksi(1, (val) => {
      return !val.NAMA_TOKO || String(val.NAMA_TOKO).toUpperCase() === "TOKO 1";
    });
  }, []);

  // =======================================================
  // LISTEN SEMUA TRANSAKSI (UNTUK OMZET, PIUTANG, DLL)
  // =======================================================
  useEffect(() => {
    const unsub = listenAllTransaksiCached((listRaw = []) => {
      setTransaksi(Array.isArray(listRaw) ? listRaw : []);
      const formatted = (listRaw || []).map((r) => ({
        ...r,
        id: r.id,
        TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
        NO_INVOICE: r.NO_INVOICE || "",
        NAMA_USER: r.NAMA_USER || "",
        NO_HP_USER: r.NO_HP_USER || "",
        NAMA_PIC_TOKO: r.NAMA_PIC_TOKO || "",
        NAMA_SALES: r.NAMA_SALES || "",
        TITIPAN_REFERENSI: r.TITIPAN_REFERENSI || "",
        NAMA_TOKO: String(r.NAMA_TOKO || r.TOKO || ""),
        TOKO: String(r.NAMA_TOKO || r.TOKO || ""),
        NAMA_BRAND: r.NAMA_BRAND || r.BRAND || "",
        NAMA_BARANG: r.NAMA_BARANG || r.BARANG || "",
        QTY: Number(r.QTY || 0),
        NOMOR_UNIK: r.NOMOR_UNIK || r.IMEI || r.NO_DINAMO || r.NO_RANGKA || "",
        IMEI: r.IMEI || "",
        NO_DINAMO: r.NO_DINAMO || "",
        NO_RANGKA: r.NO_RANGKA || "",
        KATEGORI_HARGA: r.KATEGORI_HARGA || "",
        HARGA_UNIT: Number(r.HARGA_UNIT || r.HARGA || 0),
        PAYMENT_METODE: r.PAYMENT_METODE || "",
        SYSTEM_PAYMENT: r.SYSTEM_PAYMENT || "",
        MDR: Number(r.MDR || 0),
        POTONGAN_MDR: Number(r.POTONGAN_MDR || 0),
        NO_ORDER_KONTRAK: r.NO_ORDER_KONTRAK || "",
        TENOR: r.TENOR || "",
        DP_USER_MERCHANT: Number(r.DP_USER_MERCHANT || 0),
        DP_USER_TOKO: Number(r.DP_USER_TOKO || 0),
        REQUEST_DP_TALANGAN: Number(r.REQUEST_DP_TALANGAN || 0),
        KETERANGAN: r.KETERANGAN || "",
        STATUS: r.STATUS || "Pending",
        TOTAL:
          Number(r.TOTAL) ||
          Number(r.QTY || 0) * Number(r.HARGA_UNIT || r.HARGA || 0),
      }));

      setDataTransaksi(formatted);

      const tokoNames = [
        ...new Set(formatted.map((r) => r.NAMA_TOKO || r.TOKO).filter(Boolean)),
      ];
      if (tokoNames.length > 0) setTokoList(tokoNames);

      const uniqueSales = [
        ...new Set(formatted.map((r) => r.NAMA_SALES).filter(Boolean)),
      ];
      setSalesList(uniqueSales);
    });

    return () => unsub && unsub();
  }, []);

  const totalHariIni = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return penjualan
      .filter((p) => p.tanggal === today)
      .reduce((s, p) => s + Number(p.payment.grandTotal || 0), 0);
  }, [penjualan]);

  // ==========================
  // STOCK BY TOKO (SINGLE SOURCE OF TRUTH)
  // ==========================
  const stokByToko = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      if (t.STATUS !== "Approved") return;

      const toko = t.NAMA_TOKO;
      if (!map[toko]) map[toko] = {};

      const key = t.IMEI || t.SKU || t.NAMA_BARANG;
      const qty = t.IMEI ? 1 : Number(t.QTY || 0);

      if (!map[toko][key]) map[toko][key] = 0;

      if (["PEMBELIAN", "TRANSFER_MASUK"].includes(t.PAYMENT_METODE)) {
        map[toko][key] += qty;
      }

      if (["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
        map[toko][key] -= qty;
      }
    });

    return map;
  }, [transaksi]);

  // =======================================================
  // FILTERING (UNTUK CHART & INFO)
  // =======================================================
  const filteredData = useMemo(() => {
    let f = dataTransaksi;

    if (filterToko !== "semua") {
      f = f.filter((r) => (r.NAMA_TOKO || r.TOKO) === filterToko);
    }
    if (filterSales !== "semua") {
      f = f.filter((r) => r.NAMA_SALES === filterSales);
    }

    if (filterType !== "semua" && filterValue) {
      const val = new Date(filterValue);
      f = f.filter((r) => {
        const d = new Date(r.TANGGAL_TRANSAKSI);
        if (isNaN(d.getTime())) return false;

        if (filterType === "hari") {
          return (
            d.toISOString().slice(0, 10) === val.toISOString().slice(0, 10)
          );
        }
        if (filterType === "bulan") {
          return (
            d.getFullYear() === val.getFullYear() &&
            d.getMonth() === val.getMonth()
          );
        }
        if (filterType === "tahun") {
          return d.getFullYear() === val.getFullYear();
        }
        return true;
      });
    }

    return f;
  }, [dataTransaksi, filterType, filterValue, filterToko, filterSales]);
  if (DEV) {
    console.log("SALES REPORT TOTAL =", filteredData.length);
  }
  if (DEV) {
    console.log("DASHBOARD TOTAL =", dashboardSummary.totalTransaksiHariIni);
  }
  if (DEV) {
    console.log("DASHBOARD TRANSAKSI =", dashboardSummary.totalTransaksiHariIni);
  }
  const dataHariIni = useMemo(() => {
    return filteredData.filter(
      (x) =>
        x.TANGGAL_TRANSAKSI && x.TANGGAL_TRANSAKSI.slice(0, 10) === todayStr
    );
  }, [filteredData, todayStr]);

  // =======================================================
  // METRIK DASHBOARD PUSAT
  // =======================================================
  const totalOmzet = useMemo(() => {
    return filteredData
      .filter((x) => x.STATUS === "Approved")
      .reduce((a, b) => a + Number(b.TOTAL || 0), 0);
  }, [filteredData]);

  const totalStockSemuaToko = useMemo(() => {
    return Object.values(stokByToko || {}).reduce((sum, tokoData) => {
      return (
        sum +
        Object.values(tokoData || {}).reduce((s, v) => s + Number(v || 0), 0)
      );
    }, 0);
  }, [stokByToko]);

  const totalPenjualan = useMemo(() => {
    return filteredData.filter((x) => x.STATUS === "Approved").length;
  }, [filteredData]);

  const totalPending = useMemo(() => {
    return filteredData.filter((x) => x.STATUS === "Pending").length;
  }, [filteredData]);

  const totalPiutang = useMemo(() => {
    return filteredData
      .filter((x) => x.SYSTEM_PAYMENT === "PIUTANG" && x.STATUS === "Approved")
      .reduce((a, b) => a + Number(b.TOTAL || 0), 0);
  }, [filteredData]);

  // =======================================================
  // DATA UNTUK CHART
  // =======================================================
  const COLORS = [
    "#2563EB",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#14B8A6",
    "#F97316",
    "#3B82F6",
  ];

  const registeredTokoSet = useMemo(() => {
    return new Set(TOKO_LIST.map((t) => t.toUpperCase().trim()));
  }, []);

  const omzetPerToko = useMemo(() => {
    const map = {};

    filteredData.forEach((x) => {
      let tokoRaw = x.NAMA_TOKO ?? x.TOKO;

      // 🔥 FORCE STRING + SAFETY
      if (typeof tokoRaw !== "string") {
        if (tokoRaw === null || tokoRaw === undefined) return;
        tokoRaw = String(tokoRaw);
      }

      const toko = tokoRaw.toUpperCase().trim();

      // 🔥 FILTER TOKO RESMI SAJA
      if (!registeredTokoSet.has(toko)) return;

      map[toko] = (map[toko] || 0) + Number(x.TOTAL || 0);
    });

    return Object.entries(map).map(([toko, omzet]) => ({
      toko,
      omzet,
    }));
  }, [filteredData, registeredTokoSet]);

  const omzetPerSales = useMemo(() => {
    const map = {};
    filteredData.forEach((x) => {
      const s = x.NAMA_SALES || "Tidak diketahui";
      map[s] = (map[s] || 0) + Number(x.TOTAL || 0);
    });
    return Object.entries(map).map(([sales, omzet]) => ({ sales, omzet }));
  }, [filteredData]);

  const omzetPerHari = useMemo(() => {
    const map = {};
    filteredData.forEach((x) => {
      if (!x.TANGGAL_TRANSAKSI) return;
      const tgl = new Date(x.TANGGAL_TRANSAKSI).toISOString().slice(0, 10);
      map[tgl] = (map[tgl] || 0) + Number(x.TOTAL || 0);
    });
    return Object.entries(map)
      .map(([tanggal, omzet]) => ({ tanggal, omzet }))
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
  }, [filteredData]);

  const omzetPerBulan = useMemo(() => {
    const map = {};
    filteredData.forEach((x) => {
      if (!x.TANGGAL_TRANSAKSI) return;
      const d = new Date(x.TANGGAL_TRANSAKSI);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      map[key] = (map[key] || 0) + Number(x.TOTAL || 0);
    });
    return Object.entries(map)
      .map(([bulan, omzet]) => ({ bulan, omzet }))
      .sort((a, b) => new Date(a.bulan) - new Date(b.bulan));
  }, [filteredData]);

  // =======================================================
  // EXPORT EXCEL (TANPA TABLE)
  // =======================================================
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard_Pusat");
    XLSX.writeFile(wb, "Dashboard_Pusat.xlsx");
  };

  const TOKO_AKTIF = "CILANGKAP PUSAT";

  /* ============================
      🔥 PENJUALAN CEPAT IMEI
  ============================ */
  const handleSearchImei = () => {
    const imei = searchImei.trim();
    if (!imei) return alert("Masukan IMEI");

    // 1. Cari IMEI
    const imeiFound = transaksi.find((t) => {
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();
      const status = String(t.STATUS || "").toUpperCase();

      return (
        String(t.IMEI || "")
          .trim()
          .toUpperCase() === imei.toUpperCase() &&
        (metode.includes("PEMBELIAN") || metode.includes("TRANSFER")) &&
        status === "APPROVED"
      );
    });

    if (!imeiFound) {
      alert(`IMEI ${imei} tidak ditemukan`);
      return;
    }

    // 2. CEK TOKO
    if (
      String(imeiFound.NAMA_TOKO || "").toUpperCase() !==
      TOKO_AKTIF.toUpperCase()
    ) {
      alert(
        `❌ Stok IMEI ada di toko ${imeiFound.NAMA_TOKO}, bukan di ${TOKO_AKTIF}`
      );
      return;
    }

    // 3. Lanjut jual
    const payload = {
      kategoriBarang: imeiFound.KATEGORI_BRAND,
      namaBrand: imeiFound.NAMA_BRAND,
      namaBarang: imeiFound.NAMA_BARANG,
      imei,
      qty: 1,

      hargaMap: {
        srp: imeiFound.HARGA_UNIT || 0,
        grosir: imeiFound.HARGA_GROSIR || 0,
        reseller: imeiFound.HARGA_RESELLER || 0,
      },
    };

    navigate("/toko/cilangkap-pusat/penjualan", {
      state: {
        fastSale: true,
        imeiData: payload,
      },
    });
  };

  const handleOpenStockOpname = () => {
    navigate("/stok-opname");
  };

  // =======================================================
  // UI DASHBOARD PUSAT (TANPA TABLE)
  // =======================================================
  return (
    <div className="p-4 sm:p-6 bg-gray-100 rounded-xl shadow-md min-h-screen">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-800">
        Dashboard Pusat - CILANGKAP PUSAT
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => navigate("/toko/cilangkap-pusat/penjualan")}
          className="cursor-pointer bg-gradient-to-br from-blue-500 to-blue-700 text-white p-5 rounded-2xl shadow hover:scale-[1.02] transition transform"
        >
          <FaStore size={28} />
          <h3 className="mt-3 font-bold text-lg">Penjualan Pusat</h3>
          <p className="text-xs opacity-90 mt-1">
            Melakukan Transaksi Penjualan Langsung Dari Stok CILANGKAP PUSAT.
          </p>
        </div>

        <div
          onClick={handleOpenStockOpname}
          className="cursor-pointer bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-5 rounded-2xl shadow hover:scale-[1.02] transition transform"
        >
          <FaClipboardList size={28} />
          <h3 className="mt-3 font-bold text-lg">Stock Opname Pusat</h3>
          <p className="text-xs opacity-90 mt-1">
            Audit dan Penyesuaian stok barang secara realtime Dari Gudang Pusat.
          </p>
          <p className="text-xl font-bold">
            {totalStockSemuaToko.toLocaleString("id-ID")} Unit
          </p>
        </div>

        <div
          onClick={() => navigate("/transfer-barang")}
          className="cursor-pointer bg-gradient-to-br from-orange-500 to-orange-700 text-white p-5 rounded-2xl shadow hover:scale-[1.02] transition transform"
        >
          <FaExchangeAlt size={28} />
          <h3 className="mt-3 font-bold text-lg">Transfer Gudang</h3>
          <p className="text-xs opacity-90 mt-1">
            Mengirim barang ke semua toko cabang secara realtime & online.
          </p>
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-800">
        Informasi Semua Transaksi
      </h2>

      {/* ================= CARD SUMMARY DASHBOARD ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 1. INFORMASI KEUANGAN */}
        <div
          onClick={() => navigate("/master-pembelian")}
          className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-green-50"
        >
          <div className="flex items-center gap-2">
            <FaMoneyBillWave className="text-green-600" />
            <span className="text-xs text-gray-500">
              Informasi Omset Keuangan
            </span>
          </div>

          <div className="text-xl font-bold text-green-600">
            Rp{" "}
            {dataTransaksi
              .filter(
                (x) =>
                  x.PAYMENT_METODE === "PEMBELIAN" && x.STATUS === "Approved"
              )
              .reduce((s, x) => s + Number(x.TOTAL || 0), 0)
              .toLocaleString("id-ID")}
          </div>

          <p className="text-[11px] text-gray-500">
            Total nominal pembelian stok
          </p>
        </div>

        {/* 2. INFORMASI PENJUALAN */}
        <div
          onClick={() => navigate("/toko/:tokoId/penjualan")}
          className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-blue-50"
        >
          <div className="flex items-center gap-2">
            <FaStore className="text-blue-600" />
            <span className="text-xs text-gray-500">Informasi Penjualan</span>
          </div>

          <div className="text-xl font-bold text-blue-600">
            {dashboardSummary.totalTransaksiHariIni.toLocaleString("id-ID")} Transaksi
          </div>

          <p className="text-[11px] text-gray-500">Total Transaksi Hari Ini</p>
        </div>

        {/* 3. TOTAL NOMINAL PENJUALAN PERBULAN */}
        <div
          onClick={() =>
            navigate("/toko/:tokoId/penjualan", {
              state: { type: "ALL" },
            })
          }
          className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-green-50 transition"
        >
          <div className="flex items-center gap-2">
            <FaMoneyBillWave className="text-green-600" />
            <span className="text-xs text-gray-500">
              Total Nominal Penjualan perBulan
            </span>
          </div>

          <div className="mt-2 text-lg font-bold text-green-700">
            {dashboardSummary.totalNominalBulanIni.toLocaleString("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            })}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Bulan{" "}
            {new Date().toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* 4. PENJUALAN HARI INI */}
        <div
          onClick={() =>
            navigate("/toko/:tokoId/penjualan", {
              state: { tanggal: todayStr },
            })
          }
          className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-indigo-50"
        >
          <div className="flex items-center gap-2">
            <FaMoneyBillWave className="text-indigo-600" />
            <span className="text-xs text-gray-500">Penjualan Hari Ini</span>
          </div>

          <div className="text-xl font-bold text-indigo-600">
            Rp {dashboardSummary.totalNominalHariIni.toLocaleString("id-ID")}
          </div>

          <p className="text-[11px] text-gray-500">
            Total nominal transaksi berhasil hari ini
          </p>
        </div>

        {/* 5. STOK MASTER BARANG */}
        <div
          onClick={() => navigate("/master-pembelian")}
          className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-purple-50"
        >
          <div className="flex items-center gap-2">
            <FaBoxes className="text-purple-600" />
            <span className="text-xs text-gray-500">
              TRANSAKSI MASTER PEMBELIAN
            </span>
          </div>

          <div className="text-xl font-bold text-purple-600">
            {dataTransaksi
              .filter(
                (x) =>
                  x.PAYMENT_METODE === "PEMBELIAN" && x.STATUS === "Approved"
              )
              .reduce((s, x) => s + (x.IMEI ? 1 : Number(x.QTY || 0)), 0)}{" "}
            Unit
          </div>

          <p className="text-[11px] text-gray-500">Total Unit Stok Masuk</p>
        </div>

        {/* 6. TOTAL TRANSAKSI TRANSFER GUDANG */}
        <div
          onClick={() => navigate("/transfer-barang")}
          className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-orange-50"
        >
          <div className="flex items-center gap-2">
            <FaExchangeAlt className="text-orange-600" />
            <span className="text-xs text-gray-500">
              Total Transaksi Transfer Gudang
            </span>
          </div>

          <div className="text-xl font-bold text-orange-600">
            {
              [
                ...new Set(
                  dataTransaksi
                    .filter((x) =>
                      ["TRANSFER_MASUK", "TRANSFER_KELUAR"].includes(
                        String(x.PAYMENT_METODE || "").toUpperCase()
                      )
                    )
                    .map((x) => x.NO_SURAT_JALAN) // 🔥 HITUNG PER SURAT JALAN
                    .filter(Boolean)
                ),
              ].length
            }{" "}
            Surat Jalan
          </div>

          <p className="text-[11px] text-gray-500">
            Total Barang hasil Transfer Gudang
          </p>
        </div>

        {/* 7. INFORMASI PIUTANG */}
        <div
          onClick={() =>
            navigate("/toko/:tokoId/penjualan", {
              state: { payment: "PIUTANG" },
            })
          }
          className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-red-50"
        >
          <div className="flex items-center gap-2">
            <FaHandHoldingUsd className="text-red-600" />
            <span className="text-xs text-gray-500">Informasi Piutang</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Total transaksi kredit yang masih tercatat
          </p>

          <div className="text-xl font-bold text-red-600">
            {dashboardSummary.totalPiutangAktif}
            Transaksi
          </div>

          <p className="text-[11px] text-gray-500">Transaksi status PIUTANG</p>
        </div>

        {/* 8. TOTAL PENJUALAN */}
        <div
          onClick={() => navigate("/toko/:tokoId/penjualan")}
          className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-sky-50"
        >
          <div className="flex items-center gap-2">
            <FaStore className="text-sky-600" />
            <span className="text-xs text-gray-500">
              TOTAL PENJUALAN BARANG
            </span>
          </div>

          <div className="text-xl font-bold text-sky-600">
            {dashboardSummary.totalBarangTerjualBulanIni.toLocaleString("id-ID")} Unit
          </div>

          <p className="text-[11px] text-gray-500">
            Total unit barang terjual bulan ini
          </p>
        </div>
      </div>

      {/* ======================================================= */}
      {/* MODERN DASHBOARD CHART */}
      {/* ======================================================= */}

      <div className="space-y-6 mt-6">
        {/* =================================================== */}
        {/* ROW 1 */}
        {/* =================================================== */}
        <div className="space-y-6 mt-6">
          {/* ===================================== */}
          {/* PENJUALAN PER TOKO FULL WIDTH */}
          {/* ===================================== */}
          <div
            className="
    bg-white
    border
    border-slate-200
    rounded-3xl
    shadow-sm
    p-5
    w-full
  "
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Penjualan Per Toko
                </h3>

                <p className="text-sm text-slate-500">
                  Monitoring realtime seluruh toko
                </p>
              </div>

              <div
                className="
        px-3 py-1
        rounded-full
        bg-emerald-100
        text-emerald-700
        text-xs
        font-semibold
      "
              >
                Realtime
              </div>
            </div>

            <div className="max-h-[700px] overflow-auto">
              <CardPenjualanToko dataToko={dashboardSummary.dataToko} />
            </div>
          </div>

          {/* ===================================== */}
          {/* CHART HARIAN + BULANAN */}
          {/* ===================================== */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* HARIAN */}
            <div
              className="
    bg-white
    border
    border-slate-200
    rounded-3xl
    shadow-sm
    p-5
  "
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-800">
                  Omzet Harian
                </h3>

                <p className="text-sm text-slate-500">
                  Grafik transaksi harian realtime
                </p>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={omzetPerHari}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                    <XAxis
                      dataKey="tanggal"
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      formatter={(v) =>
                        `Rp ${Number(v).toLocaleString("id-ID")}`
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="omzet"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BULANAN */}
            <div
              className="
    bg-white
    border
    border-slate-200
    rounded-3xl
    shadow-sm
    p-5
  "
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-800">
                  Omzet Bulanan
                </h3>

                <p className="text-sm text-slate-500">
                  Statistik omzet bulanan seluruh toko
                </p>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={omzetPerBulan}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                    <XAxis
                      dataKey="bulan"
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      formatter={(v) =>
                        `Rp ${Number(v).toLocaleString("id-ID")}`
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="omzet"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
