// src/pages/Reports/InventoryReport.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaEdit,
  FaTrash,
  FaUpload,
  FaDownload,
  FaExchangeAlt,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  transferStock,
} from "../../services/FirebaseService";
// IMPORT DUMMY PUSAT
import DummyStockPusat from "../../data/DummyStockPusat";


// fallback toko names (same used across app)
const fallbackTokoNames = [
  "CILANGKAP",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
  "PUSAT",
];

const PUSAT_NAME = "PUSAT";

export default function InventoryReport() {
  // main states
  const [allData, setAllData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterToko, setFilterToko] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const [detailItem, setDetailItem] = useState(null);
  const tableRef = useRef(null);

  // Transfer modal state
  // ---------- Modal Stock Pusat & Antar Toko ----------
const [pusatModalOpen, setPusatModalOpen] = useState(false);
const [antarModalOpen, setAntarModalOpen] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromToko: PUSAT_NAME,
    toToko: "",
    sku: "",
    nama: "",
    barang: "",
    qty: 1,
    imei: "",
    keterangan: "",
    performedBy: "",
  });
  const [transferLoading, setTransferLoading] = useState(false);

  // CSV-driven dropdowns & random picks
  const [csvLoaded, setCsvLoaded] = useState(false);
  const [csvData, setCsvData] = useState([]); // raw rows as objects
  const [brandOptions, setBrandOptions] = useState([]);
  const [barangOptions, setBarangOptions] = useState([]);
  const [warnaOptions, setWarnaOptions] = useState([]);
  const [kategoriHargaOptions, setKategoriHargaOptions] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [tenorOptions, setTenorOptions] = useState([]);
  const [salesOptions, setSalesOptions] = useState([]);
  const [tokoOptionsFromCsv, setTokoOptionsFromCsv] = useState([]);
  const [randomItems50, setRandomItems50] = useState([]);

  // ---------- Dummy PUSAT (20 items) ----------
  const dummyStockPusat = [
    {
      TANGGAL_TRANSAKSI: "2025-01-12",
      NO_INVOICE: "INV-2025-00001",
      NAMA_USER: "Admin Pusat",
      NO_HP_USER: "081234567890",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "STOCK MASUK",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "POLYGON",
      NAMA_BARANG: "Sepeda Listrik X1",
      QTY: 1,
      NOMOR_UNIK: "IMEI-92837465918273",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 6500000,
      PAYMENT_METODE: "CASH",
      SYSTEM_PAYMENT: "OFFLINE",
      TOTAL: 6500000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "-",
      TENOR: "-",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOCK PUSAT MASUK AWAL",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-13",
      NO_INVOICE: "INV-2025-00002",
      NAMA_USER: "Admin Pusat",
      NO_HP_USER: "081234000001",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "STOCK MASUK",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "UNITED",
      NAMA_BARANG: "U-Bike Sport",
      QTY: 1,
      NOMOR_UNIK: "IMEI-3737373737",
      KATEGORI_HARGA: "PROMO",
      HARGA_UNIT: 5900000,
      PAYMENT_METODE: "CASH",
      SYSTEM_PAYMENT: "OFFLINE",
      TOTAL: 5900000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "-",
      TENOR: "-",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOK MASUK DARI SUPPLIER",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-14",
      NO_INVOICE: "INV-2025-00003",
      NAMA_USER: "Gudang Pusat",
      NO_HP_USER: "081298765432",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "SUPPLIER",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "SELIS",
      NAMA_BARANG: "Selis Go EV",
      QTY: 1,
      NOMOR_UNIK: "RANGKA-ELX-8899",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 8700000,
      PAYMENT_METODE: "TRANSFER",
      SYSTEM_PAYMENT: "BANK",
      TOTAL: 8700000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "-",
      TENOR: "-",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOCK MASUK SUPPLIER",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-15",
      NO_INVOICE: "INV-2025-00004",
      NAMA_USER: "Admin",
      NO_HP_USER: "081200000111",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "STOCK MASUK",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "PACIFIC",
      NAMA_BARANG: "Sepeda Listrik Neo R",
      QTY: 1,
      NOMOR_UNIK: "IMEI-192837465564",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 5100000,
      PAYMENT_METODE: "CASH",
      SYSTEM_PAYMENT: "OFFLINE",
      TOTAL: 5100000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "",
      TENOR: "",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOK MASUK AWAL 2025",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-15",
      NO_INVOICE: "INV-2025-00005",
      NAMA_USER: "Admin Pusat",
      NO_HP_USER: "081244444444",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "SUPPLIER",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "VIAR",
      NAMA_BARANG: "Motor Listrik V1",
      QTY: 1,
      NOMOR_UNIK: "DINAMO-2001-A77",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 9800000,
      PAYMENT_METODE: "CASH",
      SYSTEM_PAYMENT: "OFFLINE",
      TOTAL: 9800000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "",
      TENOR: "",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOK MASUK GUDANG",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-16",
      NO_INVOICE: "INV-2025-00006",
      NAMA_USER: "Gudang",
      NO_HP_USER: "081245678901",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "SUPPLIER",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "POLYGON",
      NAMA_BARANG: "Sepeda Listrik X2",
      QTY: 1,
      NOMOR_UNIK: "IMEI-667788990011",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 7600000,
      PAYMENT_METODE: "TRANSFER",
      SYSTEM_PAYMENT: "BANK",
      TOTAL: 7600000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "",
      TENOR: "",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOK MASUK",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-17",
      NO_INVOICE: "INV-2025-00007",
      NAMA_USER: "Admin",
      NO_HP_USER: "082123456789",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "SUPPLIER",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "UNITED",
      NAMA_BARANG: "U-Bike Pro Max",
      QTY: 1,
      NOMOR_UNIK: "IMEI-445566778899",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 6600000,
      PAYMENT_METODE: "TRANSFER",
      SYSTEM_PAYMENT: "BANK",
      TOTAL: 6600000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "",
      TENOR: "",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOK SUPPLIER",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-18",
      NO_INVOICE: "INV-2025-00008",
      NAMA_USER: "Gudang",
      NO_HP_USER: "081200112233",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "SUPPLIER",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "SELIS",
      NAMA_BARANG: "Selis EcoRide",
      QTY: 1,
      NOMOR_UNIK: "IMEI-777888999000",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 7300000,
      PAYMENT_METODE: "CASH",
      SYSTEM_PAYMENT: "OFFLINE",
      TOTAL: 7300000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "",
      TENOR: "",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOK MASUK",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-19",
      NO_INVOICE: "INV-2025-00009",
      NAMA_USER: "Admin",
      NO_HP_USER: "082233112200",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "PENAMBAHAN",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "XIAOMI",
      NAMA_BARANG: "Scooter Mi S",
      QTY: 1,
      NOMOR_UNIK: "IMEI-300200100999",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 4800000,
      PAYMENT_METODE: "TRANSFER",
      SYSTEM_PAYMENT: "BANK",
      TOTAL: 4800000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "",
      TENOR: "",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOK MASUK",
      STATUS: "Approved",
    },
    {
      TANGGAL_TRANSAKSI: "2025-01-20",
      NO_INVOICE: "INV-2025-00010",
      NAMA_USER: "Admin",
      NO_HP_USER: "081233344455",
      NAMA_PIC_TOKO: "Pusat",
      NAMA_SALES: "SYSTEM",
      TITIPAN_REFERENSI: "SUPPLIER",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: "VIAR",
      NAMA_BARANG: "Motor Listrik V3",
      QTY: 1,
      NOMOR_UNIK: "DINAMO-XY77-889",
      KATEGORI_HARGA: "REGULER",
      HARGA_UNIT: 11200000,
      PAYMENT_METODE: "TRANSFER",
      SYSTEM_PAYMENT: "BANK",
      TOTAL: 11200000,
      MDR: 0,
      POTONGAN_MDR: 0,
      NO_ORDER_KONTRAK: "",
      TENOR: "",
      DP_USER_MERCHANT: 0,
      DP_USER_TOKO: 0,
      REQUEST_DP_TALANGAN: 0,
      KETERANGAN: "STOK MASUK",
      STATUS: "Approved",
    },
    // 10 more auto-generated dummies
    ...Array.from({ length: 10 }, (_, idx) => {
      const num = idx + 11;
      return {
        TANGGAL_TRANSAKSI: `2025-01-${20 + idx}`,
        NO_INVOICE: `INV-2025-000${num}`,
        NAMA_USER: "Admin",
        NO_HP_USER: `081200000${num}`,
        NAMA_PIC_TOKO: "Pusat",
        NAMA_SALES: "SYSTEM",
        TITIPAN_REFERENSI: "SUPPLIER",
        NAMA_TOKO: "PUSAT",
        NAMA_BRAND: ["POLYGON", "UNITED", "SELIS", "VIAR", "PACIFIC"][idx % 5],
        NAMA_BARANG: ["Model A", "Model B", "Model C", "Model D", "Model E"][idx % 5],
        QTY: 1,
        NOMOR_UNIK: `IMEI-DUMMY-${num}-${Date.now()}`,
        KATEGORI_HARGA: "REGULER",
        HARGA_UNIT: 5000000 + idx * 300000,
        PAYMENT_METODE: "CASH",
        SYSTEM_PAYMENT: "OFFLINE",
        TOTAL: 5000000 + idx * 300000,
        MDR: 0,
        POTONGAN_MDR: 0,
        NO_ORDER_KONTRAK: "",
        TENOR: "",
        DP_USER_MERCHANT: 0,
        DP_USER_TOKO: 0,
        REQUEST_DP_TALANGAN: 0,
        KETERANGAN: "DUMMY AUTO GENERATED",
        STATUS: "Approved",
      };
    }),
  ];

  // ---------- normalize record helper ----------
  const normalizeRecord = (r = {}) => ({
    id: r.id ?? r._id ?? r.key ?? (Date.now().toString() + Math.random().toString(36).slice(2)),
    TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
    NO_INVOICE: r.NO_INVOICE || "",
    NAMA_USER: r.NAMA_USER || "",
    NO_HP_USER: r.NO_HP_USER || "",
    NAMA_PIC_TOKO: r.NAMA_PIC_TOKO || "",
    NAMA_SALES: r.NAMA_SALES || "",
    TITIPAN_REFERENSI: r.TITIPAN_REFERENSI || "",
    NAMA_TOKO: (r.NAMA_TOKO || r.TOKO || "").toString(),
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
      Number(r.QTY || 0) * Number(r.HARGA_UNIT || r.HARGA || 0) ||
      0,
    _raw: r,
  });

  useEffect(() => {
    if (typeof listenAllTransaksi === "function") {
      const unsub = listenAllTransaksi((items = []) => {
        let normalized = [];
  
        // Jika Firebase kosong → gunakan Dummy
        if (!items || items.length === 0) {
          console.warn("Firebase kosong — menggunakan DummyStockPusat.js");
          normalized = DummyStockPusat.map((r) => normalizeRecord(r));
        } else {
          normalized = items.map((r) => normalizeRecord(r));
        }
  
        normalized.sort(
          (a, b) =>
            new Date(b.TANGGAL_TRANSAKSI || b.TANGGAL || 0) -
            new Date(a.TANGGAL_TRANSAKSI || a.TANGGAL || 0)
        );
  
        setAllData(normalized);
        setCurrentPage(1);
      });
  
      return () => unsub && unsub();
    } else {
      console.warn("listenAllTransaksi not found — memakai dummy");
      setAllData(DummyStockPusat.map((r) => normalizeRecord(r)));
    }
  }, []);
  

  // ---------- 2) CSV LOAD ----------
  useEffect(() => {
    const csvPath = "/DataMilaPhone.csv";
    fetch(csvPath)
      .then((res) => {
        if (!res.ok) throw new Error("CSV fetch failed");
        return res.text();
      })
      .then((text) => {
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (!lines.length) {
          setCsvLoaded(true);
          setCsvData([]);
          return;
        }
        const header = lines[0].split(";").map((h) => h.trim());
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(";");
          if (cols.length === 0) continue;
          const obj = {};
          for (let j = 0; j < header.length; j++) {
            obj[header[j]] = (cols[j] || "").trim();
          }
          rows.push(obj);
        }
        setCsvData(rows);

        const brandSet = new Set();
        const barangSet = new Set();
        const warnaSet = new Set();
        const kategoriSet = new Set();
        const paymentSet = new Set();
        const tenorSet = new Set();
        const salesSet = new Set();
        const tokoSet = new Set();

        rows.forEach((r) => {
          const brand = r.BRAND || r.Brand || r.brand || r["NAMA BRAND"] || "";
          const sepeda = r["SEPEDA LISTRIK"] || r.SEPEDA || r.SEPEDA_L || "";
          const namaBarang = sepeda || r["NAMA BARANG"] || r["BARANG"] || "";
          const warna = r.WARNA || r.Color || "";
          const kategori = r["KATERGORI HARGA"] || r["KATEGORI HARGA"] || r.KATEGORI || "";
          const payment = r["PAYMENT METODE"] || r["PAYMENT METHOD"] || r.PAYMENT || "";
          const tenor = r.TENOR || "";
          const sales = r["NAMA SALES"] || r.SALES || "";
          const toko = r.TOKO || r.STORE || "";

          if (brand) brandSet.add(brand);
          if (namaBarang) barangSet.add(namaBarang);
          if (warna) warnaSet.add(warna);
          if (kategori) kategoriSet.add(kategori);
          if (payment) paymentSet.add(payment);
          if (tenor) tenorSet.add(tenor);
          if (sales) salesSet.add(sales);
          if (toko) tokoSet.add(toko);
        });

        setBrandOptions(Array.from(brandSet).sort());
        setBarangOptions(Array.from(barangSet).sort());
        setWarnaOptions(Array.from(warnaSet).sort());
        setKategoriHargaOptions(Array.from(kategoriSet).sort());
        setPaymentOptions(Array.from(paymentSet).sort());
        setTenorOptions(Array.from(tenorSet).sort());
        setSalesOptions(Array.from(salesSet).sort());
        setTokoOptionsFromCsv(Array.from(tokoSet).sort());

        const uniqueItems = Array.from(barangSet).length ? Array.from(barangSet) : rows.map(r => r["NAMA BARANG"] || r["BARANG"] || r["SEPEDA LISTRIK"] || r["BATERAI"] || r["CHARGER"]).filter(Boolean);
        const pickCount = Math.min(50, uniqueItems.length);
        const shuffled = uniqueItems.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setRandomItems50(shuffled.slice(0, pickCount));

        setCsvLoaded(true);
      })
      .catch((err) => {
        console.warn("CSV load failed", err);
        setCsvLoaded(true);
        setCsvData([]);
      });
  }, []);

  // ---------- 3) Aggregate inventory ----------
  const inventory = useMemo(() => {
    const map = new Map();
    allData.forEach((r) => {
      const key =
        (r.NOMOR_UNIK && String(r.NOMOR_UNIK).trim()) ||
        `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
      if (!map.has(key))
        map.set(key, {
          key,
          brand: r.NAMA_BRAND,
          barang: r.NAMA_BARANG,
          items: [],
        });
      map.get(key).items.push(r);
    });

    const arr = [];
    for (const { key, brand, barang, items } of map.values()) {
      const perToko = {};
      let totalQty = 0;
      let lastPrice = 0;
      let status = "Pending";
      items.forEach((it) => {
        const toko = it.NAMA_TOKO || "Lainnya";
        if (!perToko[toko]) perToko[toko] = { qty: 0, entries: [] };
        perToko[toko].qty += Number(it.QTY || 0);
        perToko[toko].entries.push(it);
        totalQty += Number(it.QTY || 0);
        if (it.HARGA_UNIT) lastPrice = it.HARGA_UNIT;
        if (it.STATUS) status = it.STATUS;
      });

      // detect transfers from pusat
      let transferOutFromPusat = 0;
      const transferKeywords = ["transfer", "mutasi", "kirim", "antar", "pindah"];
      (perToko[PUSAT_NAME]?.entries || []).forEach((tx) => {
        const text = `${tx.KETERANGAN || ""} ${tx.TITIPAN_REFERENSI || ""}`.toLowerCase();
        if (transferKeywords.some((kw) => text.includes(kw))) {
          transferOutFromPusat += Number(tx.QTY || 0);
        }
      });

      arr.push({
        key,
        brand,
        barang,
        NOMOR_UNIK: items[0].NOMOR_UNIK || "",
        totalQty,
        perToko,
        lastPrice,
        status,
        entries: items,
        transferOutFromPusat,
      });
    }

    arr.sort((a, b) => b.totalQty - a.totalQty || (a.brand || "").localeCompare(b.brand || ""));
    return arr;
  }, [allData]);

  // ---------- 4) toko options final ----------
  const tokoOptionsMemo = useMemo(() => {
    const names = [...new Set(allData.map((r) => r.NAMA_TOKO).filter(Boolean))];
    if (!names.includes(PUSAT_NAME)) names.unshift(PUSAT_NAME);
    return names.length ? names : fallbackTokoNames;
  }, [allData]);

  const tokoOptionsFinal = tokoOptionsMemo.length ? tokoOptionsMemo : tokoOptionsFromCsv;

  // ---------- 5) Filtering aggregated inventory ----------
  const filteredInventory = useMemo(() => {
    return inventory.filter((it) => {
      let ok = true;
      if (filterToko !== "semua") {
        ok = ok && (it.perToko[filterToko]?.qty > 0);
      }
      if (filterStatus !== "semua") {
        ok = ok && String(it.status || "").toLowerCase() === String(filterStatus || "").toLowerCase();
      }
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        ok =
          ok &&
          ((it.NOMOR_UNIK || "").toLowerCase().includes(s) ||
            (it.brand || "").toLowerCase().includes(s) ||
            (it.barang || "").toLowerCase().includes(s));
      }
      return ok;
    });
  }, [inventory, search, filterToko, filterStatus]);

  // ---------- 6) Pagination derived ----------
  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / rowsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);
  const paginated = filteredInventory.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);
  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);

  // ---------- 7) Export aggregated Excel ----------
  const exportAggregatedExcel = () => {
    const rows = filteredInventory.map((it) => {
      const perTokoSummary = Object.entries(it.perToko)
        .map(([t, v]) => `${t}: ${v.qty}`)
        .join(" | ");
      const pusatQty = it.perToko[PUSAT_NAME]?.qty || 0;
      const inferredPusatAvailable = Math.max(0, pusatQty - (it.transferOutFromPusat || 0));
      return {
        NOMOR_UNIK: it.NOMOR_UNIK,
        BRAND: it.brand,
        BARANG: it.barang,
        TOTAL_QTY: it.totalQty,
        PUSAT_QTY: pusatQty,
        PUSAT_ESTIMATED_AVAILABLE: inferredPusatAvailable,
        PER_TOKO: perTokoSummary,
        HARGA_UNIT: it.lastPrice,
        STATUS: it.status,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InventoryAggregated");
    XLSX.writeFile(wb, `Inventory_Aggregated_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ---------- 8) Export raw transactions Excel ----------
  const exportRawExcel = () => {
    const rows = allData.map((r) => ({
      id: r.id,
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI,
      NO_INVOICE: r.NO_INVOICE,
      NAMA_TOKO: r.NAMA_TOKO,
      NAMA_BRAND: r.NAMA_BRAND,
      NAMA_BARANG: r.NAMA_BARANG,
      QTY: r.QTY,
      NOMOR_UNIK: r.NOMOR_UNIK,
      HARGA_UNIT: r.HARGA_UNIT,
      STATUS: r.STATUS,
      KETERANGAN: r.KETERANGAN,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InventoryRaw");
    XLSX.writeFile(wb, `Inventory_Raw_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ---------- 9) Export PDF ----------
  const exportPDF = async () => {
    try {
      const el = tableRef.current;
      if (!el) {
        alert("Tabel tidak ditemukan");
        return;
      }
      const canvas = await html2canvas(el, { scale: 1.5 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`Inventory_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error("Export PDF failed", e);
      alert("Gagal export PDF");
    }
  };

  // ---------- 10) Import Excel ----------
  const importExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        for (const row of json) {
          const tokoName = row.NAMA_TOKO || row.TOKO || "";
          const tokoId = fallbackTokoNames.findIndex((t) => String(t).toUpperCase() === String(tokoName).toUpperCase()) + 1;
          const payload = {
            ...row,
            QTY: Number(row.QTY || row.QUANTITY || 0),
            HARGA_UNIT: Number(row.HARGA_UNIT || row.PRICE || 0),
            TANGGAL_TRANSAKSI: row.TANGGAL_TRANSAKSI || row.TANGGAL || "",
            NAMA_BRAND: row.NAMA_BRAND || row.BRAND || "",
            NAMA_BARANG: row.NAMA_BARANG || row.BARANG || "",
            NOMOR_UNIK: row.NOMOR_UNIK || row.IMEI || "",
            STATUS: row.STATUS || "Pending",
          };

          try {
            if (row.id && tokoId && typeof updateTransaksi === "function") {
              await updateTransaksi(tokoId, row.id, payload);
            } else if (tokoId && typeof addTransaksi === "function") {
              await addTransaksi(tokoId, payload);
            } else {
              console.warn("Firebase add/update not found or missing tokoId for row:", row);
            }
          } catch (err) {
            console.error("Import row failed:", row, err);
          }
        }
        alert("Import selesai. Periksa console untuk error (jika ada).");
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Import failed", err);
      alert("Gagal import file.");
    }
  };

  // ---------- 11) Transaction actions ----------
  const handleApproveTransaction = async (tx, status = "Approved") => {
    try {
      const tokoName = tx.NAMA_TOKO || tx.TOKO || "";
      const tokoId = fallbackTokoNames.findIndex((t) => String(t).toUpperCase() === String(tokoName).toUpperCase()) + 1;
      if (!tokoId) {
        alert("Toko tidak dikenali, tidak dapat update.");
        return;
      }
      if (typeof updateTransaksi === "function") {
        await updateTransaksi(tokoId, tx.id, { STATUS: status });
      } else {
        console.warn("updateTransaksi not found");
      }
      setAllData((d) => d.map((x) => (x.id === tx.id ? { ...x, STATUS: status } : x)));
    } catch (err) {
      console.error("Approve failed", err);
      alert("Gagal approve transaksi.");
    }
  };

  const handleDeleteTransaction = async (tx) => {
    if (!window.confirm("Yakin ingin menghapus transaksi ini?")) return;
    try {
      const tokoName = tx.NAMA_TOKO || tx.TOKO || "";
      const tokoId = fallbackTokoNames.findIndex((t) => String(t).toUpperCase() === String(tokoName).toUpperCase()) + 1;
      if (!tokoId) {
        alert("Toko tidak dikenali, tidak dapat delete.");
        return;
      }
      if (typeof deleteTransaksi === "function") {
        await deleteTransaksi(tokoId, tx.id);
      } else {
        console.warn("deleteTransaksi not found");
      }
      setAllData((d) => d.filter((x) => x.id !== tx.id));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Gagal menghapus transaksi.");
    }
  };

  const handleEditTransaction = (tx) => {
    try {
      localStorage.setItem("edit_transaksi", JSON.stringify(tx));
      window.location.href = "/transaksi";
    } catch (err) {
      console.error("Edit redirect error", err);
      alert("Gagal membuka halaman edit.");
    }
  };

  // ---------- 12) Transfer ----------
  const openTransferForItem = (it) => {
    const pusatQty = it.perToko?.[PUSAT_NAME]?.qty || 0;
    setTransferForm((f) => ({
      ...f,
      fromToko: PUSAT_NAME,
      toToko: tokoOptionsFinal.find((t) => t !== PUSAT_NAME) || "",
      sku: it.NOMOR_UNIK || it.key,
      nama: it.brand || "",
      barang: it.barang || "",
      qty: Math.max(1, pusatQty),
      imei: it.NOMOR_UNIK || "",
      keterangan: `Transfer stok ${it.barang}`,
    }));
    setTransferOpen(true);
  };

  const performTransfer = async () => {
    if (!transferForm.fromToko || !transferForm.toToko || !transferForm.sku || !transferForm.qty) {
      alert("Isi semua field transfer (From, To, SKU, Qty).");
      return;
    }
    if (transferForm.fromToko === transferForm.toToko) {
      alert("Tujuan harus berbeda dengan asal.");
      return;
    }

    setTransferLoading(true);

    try {
      if (typeof transferStock !== "function") {
        throw new Error("Fungsi transferStock tidak tersedia di FirebaseService");
      }

      await transferStock({
        fromToko: transferForm.fromToko,
        toToko: transferForm.toToko,
        sku: transferForm.sku,
        qty: Number(transferForm.qty),
        nama: transferForm.nama,
        imei: transferForm.imei,
        keterangan: transferForm.keterangan,
        performedBy: transferForm.performedBy || "system",
        timestamp: new Date().toISOString(),
      });

      alert("Transfer berhasil. Data stok akan tersinkron lewat listener realtime.");
      setTransferOpen(false);
    } catch (err) {
      console.error("Transfer failed", err);
      alert("Gagal melakukan transfer: " + (err?.message || "unknown"));
    } finally {
      setTransferLoading(false);
    }
  };

  // pusat & antar lists
  const pusatList = useMemo(() => {
    return inventory
      .map((it) => {
        const pusatQty = it.perToko?.[PUSAT_NAME]?.qty || 0;
        return {
          key: it.key,
          nomor: it.NOMOR_UNIK,
          brand: it.brand,
          barang: it.barang,
          pusatQty,
          estimatedAvailable: Math.max(0, pusatQty - (it.transferOutFromPusat || 0)),
          lastPrice: it.lastPrice,
          status: it.status,
        };
      })
      .filter((x) => x.pusatQty > 0)
      .sort((a, b) => b.pusatQty - a.pusatQty);
  }, [inventory]);

  const antarTokoList = useMemo(() => {
    return inventory
      .map((it) => {
        const per = Object.entries(it.perToko || {}).filter(([t]) => t !== PUSAT_NAME);
        const total = per.reduce((s, [, v]) => s + Number(v.qty || 0), 0);
        return {
          key: it.key,
          nomor: it.NOMOR_UNIK,
          brand: it.brand,
          barang: it.barang,
          total,
          perToko: it.perToko,
        };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [inventory]);

  const fmt = (v) => {
    try {
      return Number(v || 0).toLocaleString("id-ID");
    } catch {
      return String(v || "");
    }
  };

  // ---------- Render ----------
  return (
    <div className="p-4">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow mb-4">
        <h1 className="text-2xl font-bold">Inventory Report — Pusat & Antar Toko</h1>
        <p className="text-sm opacity-90">
          Realtime stock overview. PUSAT name: <span className="font-semibold">{PUSAT_NAME}</span>
        </p>
      </div>

      {/* Top controls & Cards */}
      <div className="bg-white rounded shadow p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <FaSearch className="text-gray-500" />
          <input
            placeholder="Cari nomor unik, brand, atau nama barang..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="p-2 border rounded w-72"
          />
        </div>

        <select value={filterToko} onChange={(e) => { setFilterToko(e.target.value); setCurrentPage(1); }} className="p-2 border rounded">
          <option value="semua">Semua Toko (filter by toko yang punya stok)</option>
          {tokoOptionsFinal.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="p-2 border rounded">
          <option value="semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        {/* Cards: Lihat Stock PUSAT & Lihat Stock Antar Toko */}
        <div className="ml-2 flex gap-2">
          <button
            onClick={() => setPusatModalOpen(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded flex items-center"
            title="Lihat Stock Pusat"
          >
            Lihat Stock PUSAT
          </button>

          <button
            onClick={() => setAntarModalOpen(true)}
            className="px-3 py-2 bg-emerald-600 text-white rounded flex items-center"
            title="Lihat Stock Antar Toko"
          >
            Lihat Stock Antar Toko
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportAggregatedExcel} className="px-3 py-1 bg-indigo-600 text-white rounded flex items-center">
            <FaDownload className="mr-2" /> Export Aggregated
          </button>

          <button onClick={exportRawExcel} className="px-3 py-1 bg-green-600 text-white rounded flex items-center">
            <FaFileExcel className="mr-2" /> Export Raw
          </button>

          <button onClick={exportPDF} className="px-3 py-1 bg-red-600 text-white rounded flex items-center">
            <FaFilePdf className="mr-2" /> Export PDF
          </button>

          <label className="px-3 py-1 bg-blue-600 text-white rounded cursor-pointer flex items-center">
            <FaUpload className="mr-2" /> Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} className="hidden" />
          </label>
        </div>
      </div>

      {/* aggregated table */}
      <div className="bg-white rounded shadow overflow-x-auto mb-3" ref={tableRef}>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <tr>
              <th className="p-2 border">No</th>
              <th className="p-2 border">No EMEI</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Total Qty</th>
              <th className="p-2 border">PUSAT Qty</th>
              <th className="p-2 border">PUSAT Est. Available</th>
              <th className="p-2 border">Per Toko (qty)</th>
              <th className="p-2 border">Harga Unit</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((it, idx) => {
              const pusatQty = it.perToko?.[PUSAT_NAME]?.qty || 0;
              const pusatEst = Math.max(0, pusatQty - (it.transferOutFromPusat || 0));
              return (
                <tr key={it.key} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                  <td className="p-2 border font-mono">{it.NOMOR_UNIK || "-"}</td>
                  <td className="p-2 border">{it.brand}</td>
                  <td className="p-2 border">{it.barang}</td>
                  <td className="p-2 border text-center font-semibold">{it.totalQty}</td>
                  <td className="p-2 border text-center">{pusatQty}</td>
                  <td className="p-2 border text-center">{pusatEst}</td>
                  <td className="p-2 border">
                    {Object.entries(it.perToko || {}).map(([t, v]) => (
                      <div key={t} className="text-sm">
                        <span className="font-medium">{t}</span>: <span>{v.qty}</span>
                      </div>
                    ))}
                  </td>
                  <td className="p-2 border text-right">Rp {fmt(it.lastPrice)}</td>
                  <td className={`p-2 border font-semibold ${it.status === "Approved" ? "text-green-600" : it.status === "Rejected" ? "text-red-600" : "text-yellow-600"}`}>
                    {it.status}
                  </td>
                  <td className="p-2 border text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <button onClick={() => setDetailItem(it)} className="px-2 py-1 bg-purple-600 text-white rounded text-sm">Detail</button>
                      <button onClick={() => openTransferForItem(it)} className="px-2 py-1 bg-indigo-500 text-white rounded text-sm">Transfer</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td className="p-4 border text-center" colSpan={11}>Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex justify-between items-center mt-3 text-sm mb-8">
        <div>Halaman {currentPage} dari {totalPages} ({filteredInventory.length} items)</div>
        <div>
          <button onClick={prevPage} disabled={currentPage === 1} className="px-2 py-1 border rounded mr-2 disabled:opacity-40">
            <FaChevronLeft />
          </button>
          <button onClick={nextPage} disabled={currentPage === totalPages} className="px-2 py-1 border rounded disabled:opacity-40">
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* detail modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded shadow-lg overflow-auto max-h-[90vh] p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold">Detail Item — {detailItem.NOMOR_UNIK || detailItem.barang}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const rows = detailItem.entries.map(tx => ({ ...tx }));
                  const ws = XLSX.utils.json_to_sheet(rows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Detail");
                  XLSX.writeFile(wb, `Detail_${detailItem.NOMOR_UNIK || detailItem.barang}.xlsx`);
                }} className="px-3 py-1 bg-green-600 text-white rounded flex items-center">
                  <FaFileExcel className="mr-2" /> Export
                </button>
                <button onClick={() => setDetailItem(null)} className="px-3 py-1 border rounded">Tutup</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-indigo-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total Qty</div> <div className="text-2xl font-bold">{detailItem.totalQty}</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-gray-600">Brand</div> <div className="font-medium">{detailItem.brand}</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-gray-600">Barang</div> <div className="font-medium">{detailItem.barang}</div>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded shadow">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="p-2 border">Tanggal</th>
                    <th className="p-2 border">Invoice</th>
                    <th className="p-2 border">User</th>
                    <th className="p-2 border">No HP</th>
                    <th className="p-2 border">PIC Toko</th>
                    <th className="p-2 border">Sales</th>
                    <th className="p-2 border">Referensi</th>
                    <th className="p-2 border">Toko</th>
                    <th className="p-2 border">Brand</th>
                    <th className="p-2 border">Barang</th>
                    <th className="p-2 border">Qty</th>
                    <th className="p-2 border">No EMEI</th>
                    <th className="p-2 border">Harga Unit</th>
                    <th className="p-2 border">MDR</th>
                    <th className="p-2 border">Potongan MDR</th>
                    <th className="p-2 border">DP Merchant</th>
                    <th className="p-2 border">DP ke Toko</th>
                    <th className="p-2 border">Request DP Talangan</th>
                    <th className="p-2 border">Tenor</th>
                    <th className="p-2 border">No Order</th>
                    <th className="p-2 border">Payment</th>
                    <th className="p-2 border">System Payment</th>
                    <th className="p-2 border">Keterangan</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Total</th>
                    <th className="p-2 border">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {detailItem.entries.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{tx.TANGGAL_TRANSAKSI}</td>
                      <td className="p-2 border">{tx.NO_INVOICE}</td>
                      <td className="p-2 border">{tx.NAMA_USER}</td>
                      <td className="p-2 border">{tx.NO_HP_USER}</td>
                      <td className="p-2 border">{tx.NAMA_PIC_TOKO}</td>
                      <td className="p-2 border">{tx.NAMA_SALES}</td>
                      <td className="p-2 border">{tx.TITIPAN_REFERENSI}</td>
                      <td className="p-2 border">{tx.NAMA_TOKO}</td>
                      <td className="p-2 border">{tx.NAMA_BRAND}</td>
                      <td className="p-2 border">{tx.NAMA_BARANG}</td>
                      <td className="p-2 border text-center">{tx.QTY}</td>
                      <td className="p-2 border">{tx.NOMOR_UNIK}</td>
                      <td className="p-2 border text-right">Rp {fmt(tx.HARGA_UNIT)}</td>
                      <td className="p-2 border text-right">{fmt(tx.MDR)}</td>
                      <td className="p-2 border text-right">{fmt(tx.POTONGAN_MDR)}</td>
                      <td className="p-2 border text-right">{fmt(tx.DP_USER_MERCHANT)}</td>
                      <td className="p-2 border text-right">{fmt(tx.DP_USER_TOKO)}</td>
                      <td className="p-2 border text-right">{fmt(tx.REQUEST_DP_TALANGAN)}</td>
                      <td className="p-2 border">{tx.TENOR}</td>
                      <td className="p-2 border">{tx.NO_ORDER_KONTRAK}</td>
                      <td className="p-2 border">{tx.PAYMENT_METODE}</td>
                      <td className="p-2 border">{tx.SYSTEM_PAYMENT}</td>
                      <td className="p-2 border">{tx.KETERANGAN}</td>
                      <td className={`p-2 border font-semibold ${tx.STATUS === "Approved" ? "text-green-600" : tx.STATUS === "Rejected" ? "text-red-600" : "text-yellow-600"}`}>
                        {tx.STATUS}
                      </td>
                      <td className="p-2 border text-right">Rp {fmt(tx.TOTAL)}</td>

                      <td className="p-2 border text-center space-x-2">
                        <button onClick={() => handleApproveTransaction(tx, "Approved")} className="text-green-600 hover:text-green-800 mr-2" title="Approve">
                          <FaCheckCircle />
                        </button>
                        <button onClick={() => handleEditTransaction(tx)} className="text-blue-600 hover:text-blue-800 mr-2" title="Edit">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDeleteTransaction(tx)} className="text-red-600 hover:text-red-800" title="Delete">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

{pusatModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-5xl rounded shadow-lg p-4 max-h-[90vh] overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-bold">Stock PUSAT</h3>
        <button
          onClick={() => setPusatModalOpen(false)}
          className="px-3 py-1 border rounded"
        >
          Tutup
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">No</th>
              <th className="p-2 border">IMEI / Nomor Unik</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Est Tersedia</th>
              <th className="p-2 border">Harga Unit</th>
              <th className="p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {pusatList.map((row, idx) => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="p-2 border text-center">{idx + 1}</td>
                <td className="p-2 border">{row.nomor}</td>
                <td className="p-2 border">{row.brand}</td>
                <td className="p-2 border">{row.barang}</td>
                <td className="p-2 border text-center">{row.pusatQty}</td>
                <td className="p-2 border text-center">{row.estimatedAvailable}</td>
                <td className="p-2 border text-right">{row.lastPrice?.toLocaleString()}</td>
                <td className="p-2 border">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

{antarModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-5xl rounded shadow-lg p-4 max-h-[90vh] overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-bold">Stock Antar Toko</h3>
        <button
          onClick={() => setAntarModalOpen(false)}
          className="px-3 py-1 border rounded"
        >
          Tutup
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-emerald-600 text-white">
            <tr>
              <th className="p-2 border">No</th>
              <th className="p-2 border">IMEI / Nomor Unik</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Total Qty</th>
              <th className="p-2 border">Per Toko</th>
            </tr>
          </thead>
          <tbody>
            {antarTokoList.map((row, idx) => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="p-2 border text-center">{idx + 1}</td>
                <td className="p-2 border">{row.nomor}</td>
                <td className="p-2 border">{row.brand}</td>
                <td className="p-2 border">{row.barang}</td>
                <td className="p-2 border text-center">{row.total}</td>
                <td className="p-2 border">
                  {Object.entries(row.perToko)
                    .filter(([t]) => t !== "PUSAT")
                    .map(([tok, v]) => (
                      <div key={tok}>{tok}: {v.qty}</div>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  </div>
)}


      {/* Transfer modal */}
      {transferOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Transfer Barang</h3>
              <button onClick={() => setTransferOpen(false)} className="px-2 py-1 border rounded">Tutup</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600">Dari Toko</label>
                <select value={transferForm.fromToko} onChange={(e) => setTransferForm((f) => ({ ...f, fromToko: e.target.value }))} className="w-full border rounded px-2 py-1">
                  {tokoOptionsFinal.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600">Ke Toko</label>
                <select value={transferForm.toToko} onChange={(e) => setTransferForm((f) => ({ ...f, toToko: e.target.value }))} className="w-full border rounded px-2 py-1">
                  <option value="">Pilih tujuan</option>
                  {tokoOptionsFinal.filter(t => t !== transferForm.fromToko).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600">SKU / No EMEI</label>
                <div className="flex gap-2">
                  <select value={transferForm.sku} onChange={(e) => setTransferForm((f) => ({ ...f, sku: e.target.value }))} className="w-full border rounded px-2 py-1">
                    <option value="">{transferForm.sku || "Pilih dari daftar..."}</option>
                    {randomItems50.map((it) => <option key={it} value={it}>{it}</option>)}
                  </select>
                  <input value={transferForm.sku} onChange={(e) => setTransferForm((f) => ({ ...f, sku: e.target.value }))} placeholder="atau ketik manual" className="w-36 border rounded px-2 py-1" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Qty</label>
                <input type="number" min={1} value={transferForm.qty} onChange={(e) => setTransferForm((f) => ({ ...f, qty: Number(e.target.value) }))} className="w-full border rounded px-2 py-1" />
              </div>

              <div>
                <label className="text-xs text-slate-600">Nama / Brand</label>
                <div className="flex gap-2">
                  <select value={transferForm.nama} onChange={(e) => setTransferForm((f) => ({ ...f, nama: e.target.value }))} className="w-full border rounded px-2 py-1">
                    <option value="">{transferForm.nama || "Pilih brand..."}</option>
                    {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <input value={transferForm.nama} onChange={(e) => setTransferForm((f) => ({ ...f, nama: e.target.value }))} placeholder="atau ketik manual" className="w-36 border rounded px-2 py-1" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Nama Barang</label>
                <div className="flex gap-2">
                  <select value={transferForm.barang} onChange={(e) => setTransferForm((f) => ({ ...f, barang: e.target.value }))} className="w-full border rounded px-2 py-1">
                    <option value="">{transferForm.barang || "Pilih barang..."}</option>
                    {barangOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <input value={transferForm.barang} onChange={(e) => setTransferForm((f) => ({ ...f, barang: e.target.value }))} placeholder="atau ketik manual" className="w-36 border rounded px-2 py-1" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">IMEI (opsional)</label>
                <input value={transferForm.imei} onChange={(e) => setTransferForm((f) => ({ ...f, imei: e.target.value }))} className="w-full border rounded px-2 py-1" />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-600">Keterangan</label>
                <input value={transferForm.keterangan} onChange={(e) => setTransferForm((f) => ({ ...f, keterangan: e.target.value }))} className="w-full border rounded px-2 py-1" />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setTransferOpen(false); }} className="px-4 py-2 border rounded">Batal</button>
              <button onClick={performTransfer} disabled={transferLoading} className="px-4 py-2 bg-indigo-600 text-white rounded">
                {transferLoading ? "Proses..." : "Kirim Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUSAT modal */}
      {/*
        Rendered when user clicks "Lihat Stock PUSAT".
        Show pusatList aggregated.
      */}
      {/* To keep response short this UI is included earlier via setPusatModalOpen state
          but ensure pusatModalOpen state exists and is handled. */}
    </div>
  );
}
