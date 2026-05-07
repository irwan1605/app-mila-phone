// src/pages/StockOpname.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addTransaksi,
  updateTransaksi,
  listenAllTransaksi,
  deleteTransaksi,
  addStock,
  reduceStock,
  listenMasterBarangHarga,
} from "../services/FirebaseService";
import StockBarang from "../data/StockBarang";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useLocation } from "react-router-dom";
import { deriveStockFromTransaksi } from "../utils/stockDerived";
import { useNavigate } from "react-router-dom";

import {
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaFilePdf,
  FaSearch,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import TableStockOpname from "./table/TableStockOpname";

const TOKO_ID_MAP = {
  1: "CILANGKAP PUSAT",
  2: "CIBINONG",
  3: "GAS ALAM",
  4: "CITEUREUP",
  5: "MARKETPLACE",
  6: "METLAND 1",
  7: "METLAND 2",
  8: "PITARA",
  9: "KOTA WISATA",
  10: "SAWANGAN",
};

/* ======================================================
   KONSTANTA
====================================================== */
const fallbackTokoNames = [
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
];

const rowsPerPageDefault = 12;
const FORM_STORAGE_KEY = "stockOpnameFormDraft";

const STOCKABLE_CATEGORY = [
  "MOTOR LISTRIK",
  "SEPEDA LISTRIK",
  "HANDPHONE",

  // ✅ tambahan
  "ACCESSORIES",
  "SPARE PART",
  "JASA",
];

const normalizeImei = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^0-9]/g, "");

    const normalizeText = (v) =>
      String(v || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

/* ======================================================
   COMPONENT
====================================================== */
export default function StockOpname() {
  /* ================== STATE ================== */
  const [opnameMap, setOpnameMap] = useState({});
  const navigate = useNavigate();

  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);

  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageDefault);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterImei, setFilterImei] = useState("");

  const [transaksi, setTransaksi] = useState([]);
  const [exportMode, setExportMode] = useState("filter");
  // "filter" | "semua"

  useEffect(() => {
    const unsub = listenAllTransaksi((rows) => {
      setTransaksi(rows || []);
    });

    return () => unsub && unsub();
  }, []);

  const [masterHargaMap, setMasterHargaMap] = useState({});
  const tableRef = useRef(null);
  const [viewMode, setViewMode] = useState("SKU"); // SKU | IMEI

  /* ================== USER ================== */
  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin =
    loggedUser?.role === "superadmin" || loggedUser?.level === "superadmin";

  const location = useLocation();
  const lockedTokoFromNav = location?.state?.lockedToko || null;

  const [allTransaksi, setAllTransaksi] = useState([]);
  const [filterToko, setFilterToko] = useState("semua");

  const rawTokoLogin =
    lockedTokoFromNav ||
    loggedUser?.toko ||
    localStorage.getItem("TOKO_LOGIN") ||
    null;

  const tokoLogin =
    typeof rawTokoLogin === "number"
      ? TOKO_ID_MAP[rawTokoLogin]
      : TOKO_ID_MAP[Number(rawTokoLogin)] || rawTokoLogin;

  /* ======================================================
     LOAD MASTER HARGA
  ====================================================== */
  useEffect(() => {
    if (typeof listenMasterBarangHarga !== "function") return;
    const unsub = listenMasterBarangHarga((rows = []) => {
      const map = {};
      rows.forEach((r) => {
        const key =
          (r.NOMOR_UNIK && String(r.NOMOR_UNIK).trim()) ||
          `${r.NAMA_BRAND}|${r.NAMA_BARANG}`;
        map[key] = {
          hargaSRP: Number(r.HARGA_SRP || r.HARGA_UNIT || r.HARGA || 0),
        };
      });
      setMasterHargaMap(map);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (!isSuperAdmin && tokoLogin) {
      setFilterToko(tokoLogin); // 🔒 PIC toko dikunci ke tokonya
    }
  }, [isSuperAdmin, tokoLogin]);

  useEffect(() => {
    if (typeof listenAllTransaksi !== "function") return;

    const unsub = listenAllTransaksi((rows = []) => {
      console.log("🔥 ALL TRANSAKSI (RAW):", rows);

      setAllTransaksi(
        rows.filter(
          (t) =>
            t &&
            ["APPROVED", "REFUND"].includes(
              String(t.STATUS || "").toUpperCase()
            ) &&
            [
              "PEMBELIAN",
              "TRANSFER_MASUK",
              "STOK OPNAME",
              "VOID OPNAME",
              "PENJUALAN",
              "TRANSFER_KELUAR",
              "REFUND",
              "RETUR",
            ].includes(String(t.PAYMENT_METODE || "").toUpperCase())
        )
      );
    });

    return () => unsub && unsub();
  }, []);

  // =======================================
  // STOCK ENGINE V3 (EVENT BASED)
  // =======================================
  const getStockEffectV3 = (t) => {
    const metode = String(t.PAYMENT_METODE || "")
      .toUpperCase()
      .trim();

    const qty = Number(t.QTY || 0);

    // hanya transaksi stok
    if (!qty) return 0;

    switch (metode) {
      case "PEMBELIAN":
      case "TRANSFER_MASUK":
      case "REFUND":
        return Math.abs(qty);

      case "PENJUALAN":
      case "TRANSFER_KELUAR":
        return -Math.abs(qty);

      default:
        return 0;
    }
  };

    // ======================================
// 🔥 ACTIVE IMEI FINAL
// ======================================
const activeImeiSet = useMemo(() => {
  const set = new Set();

  allTransaksi.forEach((t) => {
    if (!t) return;

    // ✅ hanya pembelian approved
    if (
      String(t.PAYMENT_METODE || "")
        .toUpperCase() === "PEMBELIAN" &&
      String(t.STATUS || "")
        .toUpperCase() === "APPROVED" &&
      t.IMEI
    ) {
      set.add(
        normalizeImei(t.IMEI)
      );
    }
  });

  return set;
}, [allTransaksi]);

  // ===============================
  // 🔥 SUPPLIER LOOKUP FINAL
  // ===============================
  const supplierLookup = useMemo(() => {
    const map = {};
  
    transaksi.forEach((t) => {
      if (!t) return;
  
      const supplier =
        t.NAMA_SUPPLIER ||
        t.namaSupplier ||
        t.SUPPLIER ||
        "-";
  
      // 🔥 IMEI
      if (t.IMEI) {
        const imei = String(t.IMEI).trim();
  
        map[imei] = supplier;
  
        const clean = normalizeImei(imei);
  
        map[clean] = supplier;
      }
  
      // 🔥 NON IMEI
      const skuKey = `${normalizeText(
        t.NAMA_BRAND
      )}|${normalizeText(t.NAMA_BARANG)}`;
  
      map[skuKey] = supplier;
    });
  
    return map;
  }, [transaksi]);

  const stockOpnameData = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      if (!t) return;

      // ===============================
      // 1️⃣ TRANSAKSI STOK NORMAL
      // ===============================
      if (t.PAYMENT_METODE && t.NAMA_BARANG) {
        if (String(t.STATUS).toUpperCase() !== "APPROVED") return;

        const toko = t.NAMA_TOKO || t.tokoPengirim || t.ke;

        if (!toko) return;

        const key = t.IMEI
          ? `${toko}|${t.IMEI}`
          : `${toko}|${t.NAMA_BRAND}|${t.NAMA_BARANG}`;

        const effect = getStockEffectV3(t);

        if (!map[key]) {
          map[key] = {
            key,
            tanggal: t.TANGGAL_TRANSAKSI || "-",
            toko,
            supplier: t.NAMA_SUPPLIER || t.namaSupplier || t.SUPPLIER || "-",
            brand: t.NAMA_BRAND,
            barang: t.NAMA_BARANG,
            imei: t.IMEI || "",
            qty: 0,
            lastTransaksi: t.PAYMENT_METODE,
          };
        }

        map[key].qty += effect;
      }

      // ===============================
      // 2️⃣ REFUND DARI TRANSAKSI PENJUALAN
      // (ACCESSORIES / SPAREPART / JASA)
      // ===============================
      if (t.statusPembayaran === "REFUND" && Array.isArray(t.items)) {
        const toko = t.toko || t.NAMA_TOKO;
        if (!toko) return;

        t.items.forEach((it) => {
          // hanya non IMEI
          if (it.imeiList?.length) return;

          const key = `${toko}|${it.namaBrand}|${it.namaBarang}`;

          if (!map[key]) {
            map[key] = {
              key,
              tanggal: t.tanggal || "-",
              toko,
              supplier:
                t.NAMA_SUPPLIER ||
                t.namaSupplier ||
                t.SUPPLIER ||
                supplierLookup?.[`${it.namaBrand}|${it.namaBarang}`] ||
                "-",
              brand: it.namaBrand,
              barang: it.namaBarang,
              imei: "",
              qty: 0,
              lastTransaksi: "REFUND",
            };
          }

          // ✅ REFUND = +QTY
          map[key].qty += Number(it.qty || 0);
        });
      }
    });

    // tampilkan hanya stok tersedia
    return Object.values(map)
    .filter((r) => r.qty > 0)
  
    // =====================================
    // 🔥 HAPUS DATA LIAR IMEI LAMA
    // =====================================
    .filter((r) => {
      // ✅ NON IMEI tetap tampil
      if (!r.imei) {
        return true;
      }
  
      const cleanImei =
        normalizeImei(r.imei);
  
      const isRefund =
        String(
          r.lastTransaksi || ""
        ).toUpperCase() === "REFUND";
  
      // =====================================
      // ❌ REFUND IMEI LAMA
      // =====================================
      if (
        isRefund &&
        !activeImeiSet.has(cleanImei)
      ) {
        return false;
      }
  
      return true;
    });
  }, [transaksi]);

  // ===============================
  // 3️⃣ STOCK MAP (AGREGAT STOK)
  // ===============================
  const stockMap = useMemo(() => {
    return deriveStockFromTransaksi(
      allTransaksi.filter(
        (t) =>
          t &&
          ["APPROVED", "REFUND"].includes(
            String(t.STATUS || "").toUpperCase()
          ) &&
          [
            "PEMBELIAN",
            "TRANSFER_MASUK",
            "STOK OPNAME",
            "VOID OPNAME",
            "PENJUALAN",
            "TRANSFER_KELUAR",
            "REFUND",
            "RETUR",
          ].includes(t.PAYMENT_METODE)
      )
    );
  }, [allTransaksi]);

  const normalizeKey = (t = {}) => {
    if (t.IMEI) return String(t.IMEI).trim();
    if (t.NOMOR_UNIK) return String(t.NOMOR_UNIK).trim();
    return `${t.NAMA_BRAND || ""}|${t.NAMA_BARANG || ""}`.trim();
  };

  // ===============================
  // 4️⃣ DETAIL LOOKUP (WAJIB DI SINI)
  // ===============================
  const detailStockLookup = useMemo(() => {
    const map = {};

    allTransaksi.forEach((t) => {
      if (
        !t ||
        String(t.STATUS).toUpperCase() !== "APPROVED" ||
        t.PAYMENT_METODE !== "PEMBELIAN"
      )
        return;

      const key = normalizeKey(t);
      if (!key) return;

      // simpan data pembelian pertama saja
      if (!map[key]) {
        map[key] = {
          tanggal:
            t.TANGGAL_TRANSAKSI ||
            t.tanggal ||
            new Date(t.createdAt || Date.now()).toISOString().slice(0, 10),

          supplier: t.NAMA_SUPPLIER || "-",

          imei: t.IMEI || t.NOMOR_UNIK || "",
        };
      }
    });

    return map;
  }, [allTransaksi]);

  const masterPembelianLookup = useMemo(() => {
    const map = {};

    allTransaksi.forEach((t) => {
      if (!t) return;

      if (
        t.PAYMENT_METODE === "PEMBELIAN" &&
        String(t.STATUS).toUpperCase() === "APPROVED" &&
        t.IMEI
      ) {
        const key = String(t.IMEI).trim();

        // 🔥 KEY ASLI
        map[key] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          supplier: t.NAMA_SUPPLIER || "-",
          imei: key,
        };

        // 🔥 KEY NORMALIZE (ANTI BUG REFUND)
        const cleanKey = normalizeImei(t.IMEI);

        map[cleanKey] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          supplier: t.NAMA_SUPPLIER || "-",
          imei: key, // 🔥 tetap simpan versi asli
        };
      }
    });

    console.log("MASTER PEMBELIAN LOOKUP:", map);
    return map;
  }, [allTransaksi]);

  const getStockEffect = (row) => {
    const tipe = String(row.TIPE || "").toUpperCase();

    switch (tipe) {
      case "PEMBELIAN":
        return Math.abs(Number(row.qty || 0));

      case "TRANSFER_IN":
        return Math.abs(Number(row.qty || 0));

      case "REFUND":
        return Math.abs(Number(row.qty || 0));

      case "PENJUALAN":
      case "SALE":
        return -Math.abs(Number(row.qty || 0));

      case "TRANSFER_OUT":
        return -Math.abs(Number(row.qty || 0));

      default:
        return Number(row.qty || 0);
    }
  };

  const filteredStockData = useMemo(() => {
    return stockOpnameData.map((r) => ({
      ...r,
      KATEGORI_FINAL: String(r.KATEGORI || r.kategoriBarang || "LAINNYA")
        .toUpperCase()
        .trim(),
    }));
  }, [stockOpnameData]);



  // ===============================
  // 5️⃣ AGGREGATED (BOLEH PAKAI detailStockLookup)
  // ===============================
  const aggregated = useMemo(() => {
    let rows = filteredStockData;

    if (filterToko !== "semua") {
      rows = rows.filter((r) => r.toko === filterToko);
    }

    return rows.map((r) => {
      const imeiRaw = String(r.imei || "").trim();
      const imeiKey = imeiRaw;

      // 🔥 NORMALIZE UNTUK MATCH
      const imeiClean = normalizeImei(imeiRaw);
      const skuKey = `${r.brand}|${r.barang}`;

      // ✅ PRIORITAS:
      // 1. IMEI
      // 2. SKU (Accessories / Sparepart / Jasa)
      const meta =
        (imeiKey && masterPembelianLookup[imeiKey]) ||
        (imeiClean && masterPembelianLookup[imeiClean]) ||
        (imeiKey && detailStockLookup[imeiKey]) ||
        (imeiClean && detailStockLookup[imeiClean]) ||
        detailStockLookup[skuKey] ||
        masterPembelianLookup[skuKey];
      return {
        ...r,
        tanggal: meta?.tanggal || r.tanggal || "-",
        supplier:
          meta?.supplier ||
          r.supplier ||
          r.NAMA_SUPPLIER ||
          r.namaSupplier ||
          r.SUPPLIER ||
          "-",

        // ✅ IMPORTANT
        imei: meta?.imei || imeiKey || "",
        sku: !imeiKey ? skuKey : "",

        qty: Number(r.qty || 0),
      };
    });
  }, [filteredStockData, filterToko, masterPembelianLookup, detailStockLookup]);

  const tableData = aggregated;

  // PASTIKAN INI DI BAWAH deklarasi aggregated
  useEffect(() => {
    if (aggregated.length) {
      console.log("STOCK OPNAME SAMPLE:", aggregated[0]);
    }
  }, [aggregated]);

  const filteredTableData = useMemo(() => {
    return tableData.filter((r) => {
      if (
        search &&
        !(
          r.barang?.toLowerCase().includes(search.toLowerCase()) ||
          r.brand?.toLowerCase().includes(search.toLowerCase()) ||
          r.toko?.toLowerCase().includes(search.toLowerCase()) ||
          r.imei?.toLowerCase().includes(search.toLowerCase()) ||
          r.supplier?.toLowerCase().includes(search.toLowerCase())
        )
      ) {
        return false;
      }

      if (
        filterSupplier &&
        !r.supplier?.toLowerCase().includes(filterSupplier.toLowerCase())
      ) {
        return false;
      }

      if (
        filterImei &&
        !r.imei?.toLowerCase().includes(filterImei.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [tableData, search, filterSupplier, filterImei]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTableData.length / rowsPerPage)
  );

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredTableData.slice(start, end);
  }, [filteredTableData, currentPage, rowsPerPage]);

  /* ======================================================
     TOKO OPTIONS
  ====================================================== */
  const tokoOptions = useMemo(() => {
    // 🧑‍💼 PIC TOKO → hanya 1 toko
    if (!isSuperAdmin && tokoLogin) {
      return [tokoLogin];
    }

    // 👑 SUPERADMIN → semua toko
    return Array.from(
      new Set([
        ...allTransaksi.map((r) => r.NAMA_TOKO).filter(Boolean),
        ...fallbackTokoNames,
      ])
    );
  }, [isSuperAdmin, tokoLogin, allTransaksi]);

  function normalizeRecord(r = {}) {
    return {
      id: r.id || r.key || Date.now().toString(),

      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || "",
      NO_INVOICE: r.NO_INVOICE || "",

      NAMA_TOKO:
        TOKO_ID_MAP[r.NAMA_TOKO] ||
        TOKO_ID_MAP[Number(r.NAMA_TOKO)] ||
        r.NAMA_TOKO ||
        "CILANGKAP PUSAT",

      // 🔥 WAJIB ADA
      NAMA_SUPPLIER: r.NAMA_SUPPLIER || r.SUPPLIER || r.namaSupplier || "",

      NAMA_BRAND: r.NAMA_BRAND || "",
      NAMA_BARANG: r.NAMA_BARANG || "",

      QTY: Number(r.QTY || 0),

      // 🔥 WAJIB ADA
      IMEI: r.IMEI || r.NO_IMEI || r.NO_DINAMO || r.NO_RANGKA || "",

      NOMOR_UNIK: r.NOMOR_UNIK || r.IMEI || r.NO_IMEI || "",

      HARGA_SUPLAYER: Number(r.HARGA_SUPLAYER || 0),
      hargaSRP: Number(r.hargaSRP || r.HARGA || 0),

      PAYMENT_METODE: r.PAYMENT_METODE || "",
      STATUS: r.STATUS || "Pending",
      KETERANGAN: r.KETERANGAN || "",
    };
  }

  function buildTransaksiFromStockBarang() {
    if (!Array.isArray(StockBarang)) return [];
    return StockBarang.map((s, i) =>
      normalizeRecord({
        id: `SB-${i}`,
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
        NO_INVOICE: `SB-${i}`,
        NAMA_TOKO: "CILANGKAP PUSAT",
        NAMA_BRAND: s.brand || "",
        NAMA_BARANG: s.nama || "",
        QTY: s.qty || 1,
        NOMOR_UNIK: s.imei || `SKU-${i}`,
        hargaSRP: s.harga || 0,
        STATUS: "Approved",
      })
    );
  }

  const fmt = (v) => Number(v || 0).toLocaleString("id-ID");
  const exportStockOpnameExcel = () => {
    // ==========================================
    // 🔥 EXPORT SOURCE
    // ==========================================
    const exportSource = exportMode === "semua" ? aggregated : tableData;

    // ==========================================
    // 🔥 FORMAT SESUAI TABLE UI
    // ==========================================
    const rows = exportSource.map((r, idx) => {
      // ✅ stok fisik
      const fisik = Number(opnameMap[r.key] ?? "");

      // ✅ selisih
      const selisih = Number.isNaN(fisik) ? "" : fisik - Number(r.qty || 0);

      // ✅ status
      const status = r.qty > 0 ? "TERSEDIA" : "TERJUAL";

      // ✅ keterangan
      const keterangan =
        r.lastTransaksi === "TRANSFER_MASUK" ||
        r.lastTransaksi === "TRANSFER_KELUAR"
          ? "TRANSFER BARANG"
          : r.lastTransaksi === "REFUND"
          ? "REFUND"
          : r.lastTransaksi === "RETUR"
          ? "RETUR"
          : r.lastTransaksi === "REJECT"
          ? "REJECT"
          : "-";

      return {
        NO: idx + 1,

        TANGGAL: r.tanggal || "-",

        "NAMA TOKO": r.toko || "-",

        "NAMA SUPPLIER": r.supplier || "-",

        "NAMA BRAND": r.brand || "-",

        "NAMA BARANG": r.barang || "-",

        "NO IMEI / SKU": r.imei || r.sku || "NON-IMEI",

        STATUS: status,

        KETERANGAN: keterangan,

        "STOK SISTEM": Number(r.qty || 0),

        "STOK FISIK": opnameMap[r.key] ?? "",

        SELISIH: selisih === "" ? "-" : selisih,
      };
    });

    // ==========================================
    // 🔥 GENERATE SHEET
    // ==========================================
    const ws = XLSX.utils.json_to_sheet(rows);

    // ==========================================
    // 🔥 AUTO WIDTH
    // ==========================================
    ws["!cols"] = [
      { wch: 8 }, // NO
      { wch: 18 }, // TANGGAL
      { wch: 25 }, // TOKO
      { wch: 30 }, // SUPPLIER
      { wch: 25 }, // BRAND
      { wch: 40 }, // BARANG
      { wch: 30 }, // IMEI
      { wch: 15 }, // STATUS
      { wch: 25 }, // KETERANGAN
      { wch: 15 }, // STOK SISTEM
      { wch: 15 }, // STOK FISIK
      { wch: 15 }, // SELISIH
    ];

    // ==========================================
    // 🔥 WORKBOOK
    // ==========================================
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "STOK_OPNAME");

    // ==========================================
    // 🔥 EXPORT FILE
    // ==========================================
    XLSX.writeFile(
      wb,
      `STOK_OPNAME_${exportMode}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };
  const handleVoidOpname = async (record) => {
    if (!isSuperAdmin) return;

    if (!window.confirm("Batalkan opname & kembalikan stok?")) return;

    const opnameTrx = allTransaksi.find(
      (t) =>
        t.PAYMENT_METODE === "STOK OPNAME" &&
        t.STATUS === "Approved" &&
        t.NOMOR_UNIK === record.key
    );

    if (!opnameTrx) {
      alert("Transaksi opname tidak ditemukan");
      return;
    }

    const tokoId =
      fallbackTokoNames.findIndex((n) => n === opnameTrx.NAMA_TOKO) + 1;

    const reversePayload = {
      ...opnameTrx,
      id: undefined,
      NO_INVOICE: `VOID-${Date.now()}`,
      QTY: -opnameTrx.QTY, // 🔥 BALIK ARAH
      PAYMENT_METODE: "VOID OPNAME",
      STATUS: "Approved",
      KETERANGAN: "Rollback opname",
    };

    await addTransaksi(tokoId, reversePayload);

    await updateTransaksi(tokoId, opnameTrx.id, {
      ...opnameTrx,
      STATUS: "VOID",
    });

    setAllTransaksi((d) => [
      ...d.map((x) => (x.id === opnameTrx.id ? { ...x, STATUS: "VOID" } : x)),
      normalizeRecord(reversePayload),
    ]);

    alert("✅ Opname berhasil dibatalkan");
  };

  /* ======================================================
     SIMPAN OPNAME PER SKU
  ====================================================== */
  const saveOpnameFor = async (record) => {
    const key = record.key;
    const stokFisik = Number(opnameMap[key]);
    const stokSistem = Number(record.qty || 0);

    if (Number.isNaN(stokFisik)) {
      alert("Stok fisik tidak valid");
      return;
    }

    if (stokFisik === stokSistem) {
      alert("Stok fisik sama dengan sistem");
      return;
    }

    const koreksi = stokFisik - stokSistem;

    const payload = {
      TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
      NO_INVOICE: `OPN-${Date.now()}`,
      NAMA_TOKO: record.toko,
      NAMA_BRAND: record.brand,
      NAMA_BARANG: record.barang,
      NOMOR_UNIK: record.key,
      QTY: koreksi, // 🔥 BOLEH + / -
      PAYMENT_METODE: "STOK OPNAME",
      STATUS: "Approved",
      KETERANGAN: `RESET OPNAME: sistem=${stokSistem}, fisik=${stokFisik}`,
    };

    const tokoId = fallbackTokoNames.findIndex((n) => n === record.toko) + 1;

    await addTransaksi(tokoId, payload);

    setAllTransaksi((d) => [...d, normalizeRecord(payload)]);
    setOpnameMap((m) => ({ ...m, [key]: "" }));

    alert("✅ Opname berhasil. Stok sistem = stok fisik.");
  };

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          ← Kembali
        </button>

        <span className="text-sm text-gray-500">Inventory / Stock Opname</span>
      </div>

      <h2 className="text-xl font-bold mb-4 text-blue-700">
        Stok Opname & Inventory Management Mila Phone
      </h2>

      {/* CONTROL BAR */}
      <div className="bg-white rounded-xl shadow-md p-3 mb-4 transition hover:shadow-lg">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
          {/* SEARCH */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <FaSearch className="text-gray-500" />
            <input
              placeholder="Cari IMEI / Barang / Brand / Toko / Kategori..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* FILTER TOKO */}

          <div className="min-w-[180px]">
            <select
              value={filterToko}
              onChange={(e) => setFilterToko(e.target.value)}
              disabled={!isSuperAdmin}
              className={`p-2 border rounded w-full ${
                !isSuperAdmin ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            >
              {isSuperAdmin && tokoLogin && (
                <option value="semua">SEMUA TOKO</option>
              )}
              {tokoOptions.map((toko) => (
                <option key={toko} value={toko}>
                  {toko}
                </option>
              ))}
            </select>
          </div>

          {/* EXPORT EXCEL */}
          <div className="flex-shrink-0">
            <button
              onClick={exportStockOpnameExcel}
              className="px-4 py-2 bg-indigo-600 text-white rounded flex items-center gap-2 text-sm hover:bg-indigo-700 transition whitespace-nowrap"
            >
              <FaFileExcel /> Export Excel
            </button>
          </div>

          {/* FILTER EXPORT MODE */}
          <div className="min-w-[180px]">
            <select
              value={exportMode}
              onChange={(e) => setExportMode(e.target.value)}
              className="p-2 border rounded w-full"
            >
              <option value="filter">Export Toko Terpilih</option>
              <option value="semua">Export Semua Toko</option>
            </select>
          </div>
        </div>
      </div>

      {/* OPNAME CEPAT */}
      <div className="overflow-x-auto p-2" ref={tableRef}>
        {/* OPNAME CEPAT */}
        <TableStockOpname
          data={paginatedData}
          allTransaksi={allTransaksi} // ✅ TAMBAH INI
          opnameMap={opnameMap}
          setOpnameMap={setOpnameMap}
          isSuperAdmin={isSuperAdmin}
          onSaveOpname={saveOpnameFor}
          onVoidOpname={handleVoidOpname}
          tableRef={tableRef}
        />
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            Halaman {currentPage} dari {totalPages}
          </div>

          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              ◀
            </button>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
