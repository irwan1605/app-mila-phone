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

import {
  listenAllTransaksi,
  listenStockAll,
  forceDeleteTransaksi,
  listenPenjualanRealtime,
} from "../services/FirebaseService";

// 🔥 TAMBAHKAN DISINI
const TOKO_LIST = [
  "CILANGKAP PUSAT",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
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

  const [searchImei, setSearchImei] = useState("");

  const [stockData, setStockData] = useState({});
  const [transaksi, setTransaksi] = useState([]);
  const [penjualan, setPenjualan] = useState([]);

  /* ================= LISTENER ================= */

  useEffect(() => {
    const unsub = listenPenjualanRealtime((rows) => {
      setPenjualan(Array.isArray(rows) ? rows : []);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const u1 = listenStockAll((s) => setStockData(s || {}));
    const u2 = listenAllTransaksi((t) =>
      setTransaksi(Array.isArray(t) ? t : [])
    );

    return () => {
      u1 && u1();
      u2 && u2();
    };
  }, []);

  useEffect(() => {
    const unsub = listenStockAll((listRaw = []) => {
      setStokMaster(Array.isArray(listRaw) ? listRaw : []);
    });
    return () => unsub && unsub();
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
    const unsub = listenAllTransaksi((listRaw = []) => {
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
        NAMA_TOKO: r.NAMA_TOKO || r.TOKO || "",
        TOKO: r.NAMA_TOKO || r.TOKO || "",
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
  
    transaksi.forEach(t => {
      if (t.STATUS !== "Approved") return;
  
      const toko = t.NAMA_TOKO;
      if (!map[toko]) map[toko] = {};
  
      const key = t.IMEI || t.SKU || t.NAMA_BARANG;
      const qty = t.IMEI ? 1 : Number(t.QTY || 0);
  
      if (!map[toko][key]) map[toko][key] = 0;
  
      if (["PEMBELIAN","TRANSFER_MASUK"].includes(t.PAYMENT_METODE)) {
        map[toko][key] += qty;
      }
  
      if (["PENJUALAN","TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
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

  const todayStr = new Date().toISOString().slice(0, 10);

  const dataHariIni = useMemo(() => {
    return filteredData.filter(
      (x) =>
        x.TANGGAL_TRANSAKSI && x.TANGGAL_TRANSAKSI.slice(0, 10) === todayStr
    );
  }, [filteredData, todayStr]);

  const penjualanHariIni = useMemo(() => {
    return dataHariIni.filter((x) => x.STATUS === "Approved").length;
  }, [dataHariIni]);

  const omzetHariIni = useMemo(() => {
    return dataHariIni
      .filter((x) => x.STATUS === "Approved")
      .reduce((a, b) => a + Number(b.TOTAL || 0), 0);
  }, [dataHariIni]);

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
        Object.values(tokoData || {}).reduce(
          (s, v) => s + Number(v || 0),
          0
        )
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
    return new Set(
      TOKO_LIST.map(t => t.toUpperCase().trim())
    );
  }, []);
  

  const omzetPerToko = useMemo(() => {
    const map = {};
  
    filteredData.forEach((x) => {
      const tokoRaw = x.NAMA_TOKO || x.TOKO;
      if (!tokoRaw) return;
  
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
        String(t.IMEI || "").trim().toUpperCase() === imei.toUpperCase()
 &&
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
      bundling: imeiFound.BUNDLING_ITEMS || [],
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

      {/* ================= FAST SALE IMEI ================= */}
      {/* <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-2"> */}
      {/* <FaSearch className="text-gray-400" /> */}
      {/* <input
          type="text"
          value={searchImei}
          onChange={(e) => setSearchImei(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
          placeholder="Cari IMEI..."
        /> */}
      {/* <button
          onClick={handleSearchImei}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded"
        >
          Proses Penjualan
        </button> */}
      {/* </div> */}

      {/* 3 CARD MENU UTAMA (PENJUALAN, STOCK OPNAME, TRANSFER GUDANG) */}
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
      Informasi Keuangan
    </span>
  </div>

  <div className="text-xl font-bold text-green-600">
    Rp{" "}
    {dataTransaksi
      .filter(
        (x) =>
          x.PAYMENT_METODE === "PEMBELIAN" &&
          x.STATUS === "Approved"
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
    <span className="text-xs text-gray-500">
      Informasi Penjualan
    </span>
  </div>

  <div className="text-xl font-bold text-blue-600">
  {
    dataTransaksi
      .filter(
        (x) =>
          String(x.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN" &&
          x.STATUS === "Approved" &&
          (
            String(x.STATUS_BAYAR || x.SYSTEM_PAYMENT || "")
              .toUpperCase() === "LUNAS"
          )
      )
      .reduce(
        (total, x) =>
          total + (x.IMEI ? 1 : Number(x.QTY || 0)),
        0
      )
  }{" "}
    Transaksi
  </div>

  <p className="text-[11px] text-gray-500">
    Jumlah Transaksi berhasil
  </p>
</div>

{/* 3. TRANSAKSI PENDING */}
<div
  onClick={() =>
    navigate("/toko/:tokoId/penjualan", {
      state: { status: "Pending" },
    })
  }
  className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-yellow-50"
>
  <div className="flex items-center gap-2">
    <FaClock className="text-yellow-500" />
    <span className="text-xs text-gray-500">
      Transaksi Pending
    </span>
  </div>

  <div className="text-xl font-bold text-yellow-600">
    {
      dataTransaksi.filter(
        (x) =>
          String(x.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN" &&
          x.STATUS === "Pending"
      ).length
    }
  </div>

  <p className="text-[11px] text-gray-500">
    Menunggu Proses
  </p>
</div>

{/* 4. PENJUALAN HARI INI */}
<div
  onClick={() =>
    navigate("/toko/:tokoId/penjualan", {
      state: { status: "Approved", tanggal: todayStr },
    })
  }
  className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-indigo-50"
>
  <div className="flex items-center gap-2">
    <FaMoneyBillWave className="text-indigo-600" />
    <span className="text-xs text-gray-500">
      Penjualan Hari Ini
    </span>
  </div>

  <div className="text-xl font-bold text-indigo-600">
    Rp {omzetHariIni.toLocaleString("id-ID")}
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
    {
      dataTransaksi.filter(
        (x) =>
          x.PAYMENT_METODE === "PEMBELIAN" &&
          x.STATUS === "Approved"
      ).reduce(
        (s, x) =>
          s + (x.IMEI ? 1 : Number(x.QTY || 0)),
        0
      )
    }{" "}
    Unit
  </div>

  <p className="text-[11px] text-gray-500">
    Total Unit Stok Masuk
  </p>
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
            ["TRANSFER_MASUK","TRANSFER_KELUAR"].includes(
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
    <span className="text-xs text-gray-500">
      Informasi Piutang
    </span>
  </div>

  <div className="text-xl font-bold text-red-600">
    {
      dataTransaksi.filter(
        (x) =>
          x.SYSTEM_PAYMENT === "PIUTANG" &&
          x.STATUS === "Approved"
      ).length
    }{" "}
    Transaksi
  </div>

  <p className="text-[11px] text-gray-500">
    Transaksi status PIUTANG
  </p>
</div>

{/* 8. TOTAL PENJUALAN */}
<div
  onClick={() => navigate("/toko/:tokoId/penjualan")}
  className="cursor-pointer bg-white rounded-xl shadow p-4 hover:bg-sky-50"
>
  <div className="flex items-center gap-2">
    <FaStore className="text-sky-600" />
    <span className="text-xs text-gray-500">
      TOTAL PENJUALAN
    </span>
  </div>

  <div className="text-xl font-bold text-sky-600">
    {
      dataTransaksi.filter(
        (x) => String(x.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN"
      ).length
    }{" "}
    Transaksi
  </div>

  <p className="text-[11px] text-gray-500">
    Semua status transaksi
  </p>
</div>

</div>


      {/* FILTER (UNTUK CHART & ANALYTIC) */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <FaFilter className="text-gray-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border rounded text-sm"
          >
            <option value="semua">Semua Periode</option>
            <option value="hari">Per Hari</option>
            <option value="bulan">Per Bulan</option>
            <option value="tahun">Per Tahun</option>
          </select>

          {filterType !== "semua" && (
            <input
              type="date"
              className="p-2 border rounded text-sm"
              onChange={(e) => setFilterValue(e.target.value)}
            />
          )}

          <select
            value={filterToko}
            onChange={(e) => setFilterToko(e.target.value)}
            className="p-2 border rounded text-sm"
          >
            <option value="semua">Semua Toko</option>
            {tokoList.map((t, i) => (
              <option key={i} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={filterSales}
            onChange={(e) => setFilterSales(e.target.value)}
            className="p-2 border rounded text-sm"
          >
            <option value="semua">Semua Sales</option>
            {salesList.map((s, i) => (
              <option key={i} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={exportExcel}
            className="ml-auto px-3 py-2 rounded bg-green-600 text-white text-xs sm:text-sm flex items-center gap-1"
          >
            <FaFileExcel /> Export Excel
          </button>
        </div>
      </div>

      {/* CHARTS (TETAP, TANPA TABLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* CHART TOKO */}
        <div className="bg-white p-4 rounded-2xl shadow">
          <h3 className="text-center font-semibold mb-2">Omzet Per Toko</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={omzetPerToko}>
              <XAxis dataKey="toko" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="omzet" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CHART SALES */}
        <div className="bg-white p-4 rounded-2xl shadow">
          <h3 className="text-center font-semibold mb-2">Omzet Per Sales</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={omzetPerSales}
                dataKey="omzet"
                nameKey="sales"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {omzetPerSales.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white p-4 rounded-2xl shadow">
          <h3 className="text-center font-semibold mb-2">Omzet Harian</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={omzetPerHari}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tanggal" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="omzet" stroke="#3B82F6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow">
          <h3 className="text-center font-semibold mb-2">Omzet Bulanan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={omzetPerBulan}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="omzet" stroke="#10B981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
