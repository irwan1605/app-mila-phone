// src/pages/Dashboard.jsx — FINAL (Fully Synced With DashboardToko.jsx)
import React, { useEffect, useMemo, useState } from "react";
import {
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

import { listenAllTransaksi } from "../services/FirebaseService";

export default function Dashboard() {
  // ==== SAMA DENGAN DashboardToko ====
  const fallbackTokoNames = [
    "CILANGKAP",
    "KONTEN LIVE",
    "GAS ALAM",
    "CITEUREUP",
    "CIRACAS",
    "METLAND 1",
    "METLAND 2",
    "PITARA",
    "KOTA WISATA",
    "SAWANGAN",
  ];

  const [data, setData] = useState([]);
  const [tokoList, setTokoList] = useState(fallbackTokoNames);
  const [salesList, setSalesList] = useState([]);

  const [filterType, setFilterType] = useState("semua");
  const [filterValue, setFilterValue] = useState("");
  const [filterToko, setFilterToko] = useState("semua");
  const [filterSales, setFilterSales] = useState("semua");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // =======================================================
  // LOAD FIREBASE REALTIME
  // =======================================================
  useEffect(() => {
    const unsub = listenAllTransaksi((listRaw = []) => {
      const formatted = (listRaw || []).map((r) => ({
        ...r,

        // ===== NORMALISASI FIELD =====
        id: r.id,

        TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
        NO_INVOICE: r.NO_INVOICE || "",
        NAMA_USER: r.NAMA_USER || "",
        NO_HP_USER: r.NO_HP_USER || "",

        NAMA_SALES_TOKO: r.NAMA_SALES_TOKO || "",
        NAMA_SALES: r.NAMA_SALES || "",
        TITIPAN_REFERENSI: r.TITIPAN_REFERENSI || "",

        NAMA_TOKO: r.NAMA_TOKO || r.TOKO || "",
        TOKO: r.NAMA_TOKO || r.TOKO || "",

        NAMA_BRAND: r.NAMA_BRAND || r.BRAND || "",
        NAMA_BARANG: r.NAMA_BARANG || r.BARANG || "",

        QTY: Number(r.QTY || 0),

        NOMOR_UNIK:
          r.NOMOR_UNIK || r.IMEI || r.NO_DINAMO || r.NO_RANGKA || "",
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

      setData(formatted);

      // ===== FILTER LIST TOKO =====
      const tokoNames = [
        ...new Set(formatted.map((r) => r.NAMA_TOKO || r.TOKO).filter(Boolean)),
      ];
      setTokoList(tokoNames.length > 0 ? tokoNames : fallbackTokoNames);

      // ===== FILTER LIST SALES =====
      const uniqueSales = [
        ...new Set(formatted.map((r) => r.NAMA_SALES).filter(Boolean)),
      ];
      setSalesList(uniqueSales);

      setCurrentPage(1);
    });

    return () => unsub && unsub();
  }, []);

  // =======================================================
  // FILTERING
  // =======================================================
  const filteredData = useMemo(() => {
    let f = data;

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
          return d.toISOString().slice(0, 10) === val.toISOString().slice(0, 10);
        }
        if (filterType === "bulan") {
          return d.getFullYear() === val.getFullYear() && d.getMonth() === val.getMonth();
        }
        if (filterType === "tahun") {
          return d.getFullYear() === val.getFullYear();
        }
        return true;
      });
    }

    return f;
  }, [data, filterType, filterValue, filterToko, filterSales]);

  // =======================================================
  // PAGINATION
  // =======================================================
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginated = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // =======================================================
  // EXPORT EXCEL
  // =======================================================
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
    XLSX.writeFile(wb, "Dashboard_Utama.xlsx");
  };

  // =======================================================
  // EXPORT PDF
  // =======================================================
  const exportPDF = () => {
    const table = document.getElementById("dashboardTable");
    html2canvas(table).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save("Dashboard_Utama.pdf");
    });
  };

  // =======================================================
  // CHART COLORS
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

  // =======================================================
  // OMZET PER TOKO
  // =======================================================
  const omzetPerToko = useMemo(() => {
    const map = {};
    filteredData.forEach((x) => {
      const toko = x.NAMA_TOKO || x.TOKO;
      map[toko] = (map[toko] || 0) + Number(x.TOTAL || 0);
    });
    return Object.entries(map).map(([toko, omzet]) => ({ toko, omzet }));
  }, [filteredData]);

  // =======================================================
  // OMZET PER SALES
  // =======================================================
  const omzetPerSales = useMemo(() => {
    const map = {};
    filteredData.forEach((x) => {
      const s = x.NAMA_SALES || "Tidak diketahui";
      map[s] = (map[s] || 0) + Number(x.TOTAL || 0);
    });
    return Object.entries(map).map(([sales, omzet]) => ({ sales, omzet }));
  }, [filteredData]);

  // =======================================================
  // OMZET PER HARI
  // =======================================================
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

  // =======================================================
  // OMZET PER BULAN
  // =======================================================
  const omzetPerBulan = useMemo(() => {
    const map = {};
    filteredData.forEach((x) => {
      if (!x.TANGGAL_TRANSAKSI) return;
      const d = new Date(x.TANGGAL_TRANSAKSI);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + Number(x.TOTAL || 0);
    });
    return Object.entries(map)
      .map(([bulan, omzet]) => ({ bulan, omzet }))
      .sort((a, b) => new Date(a.bulan) - new Date(b.bulan));
  }, [filteredData]);

  // =======================================================
  // UI (TIDAK DIRUBAH)
  // =======================================================
  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Dashboard Utama - PT Mila Media</h2>

      {/* FILTER */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <FaFilter />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua</option>
          <option value="hari">Per Hari</option>
          <option value="bulan">Per Bulan</option>
          <option value="tahun">Per Tahun</option>
        </select>

        {filterType !== "semua" && (
          <input
            type="date"
            className="p-2 border rounded"
            onChange={(e) => setFilterValue(e.target.value)}
          />
        )}

        <select
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Toko</option>
          {tokoList.map((t, i) => (
            <option key={i}>{t}</option>
          ))}
        </select>

        <select
          value={filterSales}
          onChange={(e) => setFilterSales(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Sales</option>
          {salesList.map((s, i) => (
            <option key={i}>{s}</option>
          ))}
        </select>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-3 rounded shadow text-center">
          <h3>Total Transaksi</h3>
          <p className="text-xl font-bold">{filteredData.length}</p>
        </div>

        <div className="bg-white p-3 rounded shadow text-center">
          <h3>Total Omzet</h3>
          <p className="text-xl font-bold text-green-600">
            Rp {filteredData.reduce((a, b) => a + Number(b.TOTAL), 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-3 rounded shadow text-center">
          <h3>Total Toko Aktif</h3>
          <p className="text-xl font-bold">{omzetPerToko.length}</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white p-2 rounded shadow overflow-auto" id="dashboardTable">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Invoice</th>
              <th className="p-2 border">User</th>
              <th className="p-2 border">No HP</th>
              <th className="p-2 border">Sales Toko</th>
              <th className="p-2 border">Sales</th>
              <th className="p-2 border">Titipan</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Nomor IMEI</th>
              <th className="p-2 border">Dinamo</th>
              <th className="p-2 border">Rangka</th>
              <th className="p-2 border">Kategori</th>
              <th className="p-2 border">Harga</th>
              <th className="p-2 border">Payment</th>
              <th className="p-2 border">System</th>
              <th className="p-2 border">MDR</th>
              <th className="p-2 border">Ptg MDR</th>
              <th className="p-2 border">Kontrak</th>
              <th className="p-2 border">Tenor</th>
              <th className="p-2 border">DP Merchant</th>
              <th className="p-2 border">DP Toko</th>
              <th className="p-2 border">Req DP</th>
              <th className="p-2 border">Ket</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Total</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-2 border">{r.TANGGAL_TRANSAKSI}</td>
                <td className="p-2 border">{r.NO_INVOICE}</td>
                <td className="p-2 border">{r.NAMA_USER}</td>
                <td className="p-2 border">{r.NO_HP_USER}</td>
                <td className="p-2 border">{r.NAMA_SALES_TOKO}</td>
                <td className="p-2 border">{r.NAMA_SALES}</td>
                <td className="p-2 border">{r.TITIPAN_REFERENSI}</td>
                <td className="p-2 border">{r.NAMA_TOKO || r.TOKO}</td>
                <td className="p-2 border">{r.NAMA_BRAND}</td>
                <td className="p-2 border">{r.NAMA_BARANG}</td>
                <td className="p-2 border text-center">{r.QTY}</td>
                <td className="p-2 border">{r.NOMOR_UNIK}</td>
                <td className="p-2 border">{r.NO_DINAMO}</td>
                <td className="p-2 border">{r.NO_RANGKA}</td>
                <td className="p-2 border">{r.KATEGORI_HARGA}</td>
                <td className="p-2 border text-right">
                  {r.HARGA_UNIT.toLocaleString()}
                </td>
                <td className="p-2 border">{r.PAYMENT_METODE}</td>
                <td className="p-2 border">{r.SYSTEM_PAYMENT}</td>
                <td className="p-2 border text-right">{r.MDR}</td>
                <td className="p-2 border text-right">{r.POTONGAN_MDR}</td>
                <td className="p-2 border">{r.NO_ORDER_KONTRAK}</td>
                <td className="p-2 border">{r.TENOR}</td>
                <td className="p-2 border text-right">{r.DP_USER_MERCHANT}</td>
                <td className="p-2 border text-right">{r.DP_USER_TOKO}</td>
                <td className="p-2 border text-right">{r.REQUEST_DP_TALANGAN}</td>
                <td className="p-2 border">{r.KETERANGAN}</td>
                <td className="p-2 border">{r.STATUS}</td>
                <td className="p-2 border text-right">
                  {Number(r.TOTAL).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between mt-3">
        <button
          className="px-3 py-1 border rounded"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <FaChevronLeft />
        </button>

        <span>
          Halaman {currentPage} dari {totalPages}
        </span>

        <button
          className="px-3 py-1 border rounded"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          <FaChevronRight />
        </button>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* CHART TOKO */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-center font-semibold">Omzet Per Toko</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={omzetPerToko}>
              <XAxis dataKey="toko" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="omzet" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CHART SALES */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-center font-semibold">Omzet Per Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={omzetPerSales}
                dataKey="omzet"
                nameKey="sales"
                cx="50%"
                cy="50%"
                outerRadius={100}
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

      {/* CHART HARIAN & BULANAN */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-center font-semibold">Omzet Harian</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={omzetPerHari}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tanggal" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="omzet" stroke="#3B82F6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-center font-semibold">Omzet Bulanan</h3>
          <ResponsiveContainer width="100%" height={300}>
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

      {/* EXPORT */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={exportExcel}
          className="px-4 py-2 rounded bg-green-600 text-white flex items-center"
        >
          <FaFileExcel className="mr-2" /> Excel
        </button>

        <button
          onClick={exportPDF}
          className="px-4 py-2 rounded bg-red-600 text-white flex items-center"
        >
          <FaFilePdf className="mr-2" /> PDF
        </button>
      </div>
    </div>
  );
}
