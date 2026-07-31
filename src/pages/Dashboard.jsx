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
  listenStockAll,
  forceDeleteTransaksi,
  listenPenjualan,
} from "../services/FirebaseService";

import {
  listenAllTransaksiCached,
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
  // const [dataTransaksi, setDataTransaksi] = useState([]);

  const [stokMaster, setStokMaster] = useState([]);

  const [filterType, setFilterType] = useState("semua");
  const [filterValue, setFilterValue] = useState("");
  const [filterToko, setFilterToko] = useState("semua");
  const [filterSales, setFilterSales] = useState("semua");

  const [searchImei, setSearchImei] = useState("");

  const [stockData, setStockData] = useState({});
  const [transaksi, setTransaksi] = useState([]);
  const dataTransaksi = useMemo(() => {
    return transaksi.map((r) => ({
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

      TOTAL:
        Number(r.TOTAL) ||
        Number(r.QTY || 0) * Number(r.HARGA_UNIT || r.HARGA || 0),
    }));
  }, [transaksi]);

  const tokoList = useMemo(() => {
    return [
      ...new Set(
        dataTransaksi

          .map((x) => x.NAMA_TOKO || x.TOKO)

          .filter(Boolean)
      ),
    ];
  }, [dataTransaksi]);

  const [penjualanList, setPenjualanList] = useState([]);
  const DEV = process.env.NODE_ENV === "development";

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
    const unsub = listenPenjualan((data) => {
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

  const dashboardSummary = useMemo(() => {
    if (!Array.isArray(penjualanList) || penjualanList.length === 0) {

      return {
  
          totalTransaksi: 0,
  
          totalTransaksiHariIni: 0,
  
          totalHariIni: 0,
  
          totalOmzet: 0,
  
          totalQty: 0,
  
          totalPending: 0,
  
          totalApproved: 0,
  
          totalTransfer: 0,
  
          totalPiutang: 0,
  
          totalNominalPenjualan: 0,
  
          totalPenjualanBarang: 0,
  
          totalPenjualanBarangPerBulan: 0,
  
          totalNominalPenjualanPerBulan: 0,
  
          omzetPerHari: [],
  
          omzetPerBulan: [],
  
          omzetPerSales: [],
  
          omzetPerToko: [],
  
      };
  
  }

    const today = new Date().toLocaleDateString("en-CA");

    const current = new Date();
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();

    const invoiceMap = new Map();
    const piutangInvoice = new Set();

    let totalTransaksi = 0;
    let totalTransaksiHariIni = 0;
    let totalHariIni = 0;
    let totalOmzet = 0;
    let totalQty = 0;
    let totalPending = 0;
    let totalApproved = 0;
    let totalTransfer = 0;
    let totalPiutang = 0;
    let totalNominalPenjualan = 0;
    let totalPenjualanBarang = 0;
    let totalPenjualanBarangPerBulan = 0;
    let totalNominalPenjualanPerBulan = 0;

    const omzetPerHariMap = new Map();
    const omzetPerBulanMap = new Map();
    const omzetPerSalesMap = new Map();
    const omzetPerTokoMap = new Map();

    for (const trx of penjualanList) {
      //------------------------------------
      // REFUND
      //------------------------------------

      if (!isValidPenjualan(trx)) continue;

      const invoice = String(
        trx.invoice || trx.NO_INVOICE || trx.noInvoice || ""
      ).trim();

      if (!invoice) continue;

      //------------------------------------
      // STATUS
      //------------------------------------

      const status = String(
        trx.STATUS || trx.status || trx.statusPembayaran || ""
      ).toUpperCase();

      if (status === "PENDING") totalPending++;

      if (status === "APPROVED") totalApproved++;

      //------------------------------------
      // PAYMENT
      //------------------------------------

      const payment = String(
        trx.SYSTEM_PAYMENT || trx.systemPayment || ""
      ).toUpperCase();

      if (payment === "PIUTANG") {
        piutangInvoice.add(invoice);
      }

      //------------------------------------
      // TANGGAL
      //------------------------------------

      const rawDate = trx.tanggal || trx.createdAt || trx.TANGGAL_TRANSAKSI;

      const trxDate = rawDate ? new Date(rawDate) : null;

      const dateKey = trxDate ? trxDate.toLocaleDateString("en-CA") : "";

      const monthKey = trxDate
        ? `${trxDate.getFullYear()}-${String(trxDate.getMonth() + 1).padStart(
            2,
            "0"
          )}`
        : "";

      //------------------------------------
      // TOTAL
      //------------------------------------

      let grandTotal = 0;

      if (Number(trx?.payment?.grandTotal || 0) > 0) {
        grandTotal = Number(trx.payment.grandTotal);
      } else if (Array.isArray(trx.items)) {
        grandTotal =
          trx.items.reduce(
            (s, it) => s + Number(it.qty || 0) * Number(it.hargaAktif || 0),
            0
          ) + Number(trx?.payment?.nominalMdr || 0);
      }

      //------------------------------------
      // QTY
      //------------------------------------

      const qty = Array.isArray(trx.items)
        ? trx.items.reduce((s, it) => s + Number(it.qty || 0), 0)
        : Number(trx.qty || trx.QTY || 0);

      //------------------------------------
      // ANTI DOUBLE INVOICE
      //------------------------------------

      if (!invoiceMap.has(invoice)) {
        invoiceMap.set(invoice, true);

        totalTransaksi++;

        totalOmzet += grandTotal;

        totalNominalPenjualan += grandTotal;

        totalQty += qty;

        totalPenjualanBarang += qty;

        if (dateKey === today) {
          // jumlah invoice hari ini
          totalTransaksiHariIni++;

          // omzet hari ini
          totalHariIni += grandTotal;
        }

        if (
          trxDate &&
          trxDate.getMonth() === currentMonth &&
          trxDate.getFullYear() === currentYear
        ) {
          totalPenjualanBarangPerBulan += qty;

          totalNominalPenjualanPerBulan += grandTotal;
        }
      }

      //------------------------------------
      // TRANSFER
      //------------------------------------

      const metode = String(trx.PAYMENT_METODE || "").toUpperCase();

      if (
        metode === "TRANSFER" ||
        metode === "TRANSFER_MASUK" ||
        metode === "TRANSFER_KELUAR"
      ) {
        totalTransfer++;
      }

      //------------------------------------
      // CHART HARI
      //------------------------------------

      if (dateKey) {
        omzetPerHariMap.set(
          dateKey,
          (omzetPerHariMap.get(dateKey) || 0) + grandTotal
        );
      }

      //------------------------------------
      // CHART BULAN
      //------------------------------------

      if (monthKey) {
        omzetPerBulanMap.set(
          monthKey,
          (omzetPerBulanMap.get(monthKey) || 0) + grandTotal
        );
      }

      //------------------------------------
      // SALES
      //------------------------------------

      const sales = trx.NAMA_SALES || "Tidak diketahui";

      omzetPerSalesMap.set(
        sales,
        (omzetPerSalesMap.get(sales) || 0) + grandTotal
      );

      //------------------------------------
      // TOKO
      //------------------------------------

      const toko = String(trx.NAMA_TOKO || trx.TOKO || "-").toUpperCase();

      omzetPerTokoMap.set(toko, (omzetPerTokoMap.get(toko) || 0) + grandTotal);
    }

    totalPiutang = piutangInvoice.size;

    return {
      totalTransaksi,
      totalTransaksiHariIni,
      totalHariIni,
      totalOmzet,
      totalQty,
      totalPending,
      totalApproved,
      totalTransfer,
      totalPiutang,
      totalNominalPenjualan,
      totalPenjualanBarang,
      totalPenjualanBarangPerBulan,
      totalNominalPenjualanPerBulan,

      omzetPerHari: Object.entries(omzetPerHariMap)
        .map(([tanggal, omzet]) => ({ tanggal, omzet }))
        .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)),

      omzetPerBulan: Object.entries(omzetPerBulanMap)
        .map(([bulan, omzet]) => ({ bulan, omzet }))
        .sort((a, b) => new Date(a.bulan) - new Date(b.bulan)),

      omzetPerSales: Object.entries(omzetPerSalesMap).map(([sales, omzet]) => ({
        sales,
        omzet,
      })),

      omzetPerToko: Object.entries(omzetPerTokoMap).map(([toko, omzet]) => ({
        toko,
        omzet,
      })),
    };
  }, [penjualanList]);

  const {
    totalTransaksi,
    totalTransaksiHariIni, // <-- TAMBAHKAN BARIS INI
    totalHariIni,
    totalOmzet,
    totalQty,
    totalPending,
    totalApproved,
    totalTransfer,
    totalPiutang,
    totalNominalPenjualan,
    totalPenjualanBarang,
    totalPenjualanBarangPerBulan,
    totalNominalPenjualanPerBulan,
    omzetPerHari,
    omzetPerBulan,
    omzetPerSales,
    omzetPerToko,
  } = dashboardSummary;

  useEffect(() => {
    const u1 = listenStockAllCached((s) => {
      setStockData(s || {});
    });

    const u2 = listenAllTransaksiCached((rows) => {
      setTransaksi(Array.isArray(rows) ? rows : []);
    });

    return () => {
      u1?.();

      u2?.();
    };
  }, []);

  useEffect(() => {
    // 🔥 HAPUS TRANSAKSI LEGACY DARI TOKO 1
    forceDeleteTransaksi(1, (val) => {
      return !val.NAMA_TOKO || String(val.NAMA_TOKO).toUpperCase() === "TOKO 1";
    });
  }, []);

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
  const dashboardFiltered = useMemo(() => {
    let rows = dataTransaksi;

    if (filterToko !== "semua") {
      rows = rows.filter((r) => (r.NAMA_TOKO || r.TOKO) === filterToko);
    }

    if (filterSales !== "semua") {
      rows = rows.filter((r) => r.NAMA_SALES === filterSales);
    }

    if (filterType !== "semua" && filterValue) {
      const val = new Date(filterValue);

      rows = rows.filter((r) => {
        const d = new Date(r.TANGGAL_TRANSAKSI);

        if (isNaN(d.getTime())) return false;

        switch (filterType) {
          case "hari":
            return (
              d.toISOString().slice(0, 10) === val.toISOString().slice(0, 10)
            );

          case "bulan":
            return (
              d.getFullYear() === val.getFullYear() &&
              d.getMonth() === val.getMonth()
            );

          case "tahun":
            return d.getFullYear() === val.getFullYear();

          default:
            return true;
        }
      });
    }

    const dataHariIni = [];

    let totalPenjualan = 0;

    for (const row of rows) {
      if (row.STATUS === "Approved") totalPenjualan++;

      if (
        row.TANGGAL_TRANSAKSI &&
        row.TANGGAL_TRANSAKSI.slice(0, 10) === todayStr
      ) {
        dataHariIni.push(row);
      }
    }

    return {
      rows,

      dataHariIni,

      totalPenjualan,
    };
  }, [
    dataTransaksi,
    filterType,
    filterValue,
    filterSales,
    filterToko,
    todayStr,
  ]);

  const {
    rows: filteredData,

    dataHariIni,

    totalPenjualan,
  } = dashboardFiltered;

  // =======================================================
  // METRIK DASHBOARD PUSAT
  // =======================================================

  const totalStockSemuaToko = useMemo(() => {
    return Object.values(stokByToko || {}).reduce((sum, tokoData) => {
      return (
        sum +
        Object.values(tokoData || {}).reduce((s, v) => s + Number(v || 0), 0)
      );
    }, 0);
  }, [stokByToko]);

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
          {Number(totalTransaksiHariIni || 0).toLocaleString("id-ID")} Transaksi
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
            {dashboardSummary.totalNominalPenjualanPerBulan.toLocaleString(
              "id-ID",
              {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }
            )}
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
            Rp {dashboardSummary.totalHariIni.toLocaleString("id-ID")}
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
            {dashboardSummary.totalPiutang}
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
            {dashboardSummary.totalPenjualanBarang.toLocaleString("id-ID")} Unit
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
              <CardPenjualanToko />
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
