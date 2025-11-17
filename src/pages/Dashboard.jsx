import React, { useEffect, useMemo, useState } from "react";
import {
  getAllData,
  getAllToko,
  getDropdownOptions,
} from "../data/database";
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

export default function Dashboard() {
  const tokoList = getAllToko();
  const [data, setData] = useState([]);
  const [filterType, setFilterType] = useState("semua");
  const [filterValue, setFilterValue] = useState("");
  const [filterToko, setFilterToko] = useState("semua");
  const [filterSales, setFilterSales] = useState("semua");
  const [salesList, setSalesList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const all = getAllData();
    setData(all);
    const opts = getDropdownOptions();
    setSalesList(opts.NAMA_SALES || []);
  }, []);

  // === FILTER DATA ===
  const filteredData = useMemo(() => {
    let filtered = data;

    if (filterToko !== "semua")
      filtered = filtered.filter((r) => r.TOKO === filterToko);

    if (filterSales !== "semua")
      filtered = filtered.filter((r) => r.NAMA_SALES === filterSales);

    if (filterType !== "semua" && filterValue) {
      const val = new Date(filterValue);
      filtered = filtered.filter((r) => {
        const d = new Date(r.TANGGAL);
        if (filterType === "hari")
          return d.toISOString().slice(0, 10) === val.toISOString().slice(0, 10);
        if (filterType === "bulan")
          return (
            d.getFullYear() === val.getFullYear() &&
            d.getMonth() === val.getMonth()
          );
        if (filterType === "tahun") return d.getFullYear() === val.getFullYear();
        return true;
      });
    }

    return filtered;
  }, [data, filterType, filterValue, filterToko, filterSales]);

  // === HITUNG OMZET GLOBAL ===
  const totalOmzet = filteredData.reduce(
    (sum, r) => sum + (Number(r.QTY) || 0) * (Number(r.HARGA) || 0),
    0
  );

  // === OMZET PER TOKO ===
  const omzetPerToko = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const t = r.TOKO || "Lainnya";
      const omzet = (Number(r.QTY) || 0) * (Number(r.HARGA) || 0);
      map[t] = (map[t] || 0) + omzet;
    });
    return Object.entries(map).map(([toko, omzet]) => ({ toko, omzet }));
  }, [filteredData]);

  // === OMZET PER SALES ===
  const omzetPerSales = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const s = r.NAMA_SALES || "Tidak Diketahui";
      const omzet = (Number(r.QTY) || 0) * (Number(r.HARGA) || 0);
      map[s] = (map[s] || 0) + omzet;
    });
    return Object.entries(map).map(([sales, omzet]) => ({ sales, omzet }));
  }, [filteredData]);

  // === OMZET PER HARI ===
  const omzetPerHari = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const date = new Date(r.TANGGAL).toISOString().slice(0, 10);
      const omzet = (Number(r.QTY) || 0) * (Number(r.HARGA) || 0);
      map[date] = (map[date] || 0) + omzet;
    });
    return Object.entries(map)
      .map(([tanggal, omzet]) => ({ tanggal, omzet }))
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
  }, [filteredData]);

  // === OMZET PER BULAN ===
  const omzetPerBulan = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const d = new Date(r.TANGGAL);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const omzet = (Number(r.QTY) || 0) * (Number(r.HARGA) || 0);
      map[key] = (map[key] || 0) + omzet;
    });
    return Object.entries(map)
      .map(([bulan, omzet]) => ({ bulan, omzet }))
      .sort((a, b) => new Date(a.bulan) - new Date(b.bulan));
  }, [filteredData]);

  // === PAGINATION ===
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);

  // === EXPORT ===
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard Utama");
    XLSX.writeFile(wb, "Dashboard_Utama.xlsx");
  };

  const handleExportPDF = () => {
    const input = document.getElementById("dashboardTable");
    html2canvas(input).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save("Dashboard_Utama.pdf");
    });
  };

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

  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-3 text-gray-700">
        Dashboard Utama - PT Mila Media Telekomunikasi
      </h2>

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
            onChange={(e) => setFilterValue(e.target.value)}
            className="p-2 border rounded"
          />
        )}

        <select
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Toko</option>
          {tokoList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filterSales}
          onChange={(e) => setFilterSales(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Sales</option>
          {salesList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* RINGKASAN */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <h3 className="text-gray-600 font-semibold">Total Transaksi</h3>
          <p className="text-2xl font-bold text-blue-600">{filteredData.length}</p>
        </div>
        <div>
          <h3 className="text-gray-600 font-semibold">Total Omzet</h3>
          <p className="text-2xl font-bold text-green-600">
            Rp {totalOmzet.toLocaleString("id-ID")}
          </p>
        </div>
        <div>
          <h3 className="text-gray-600 font-semibold">Total Toko Aktif</h3>
          <p className="text-2xl font-bold text-purple-600">
            {omzetPerToko.length}
          </p>
        </div>
      </div>

      {/* TABEL */}
      <div
        className="bg-white rounded-lg shadow overflow-x-auto"
        id="dashboardTable"
      >
        <table className="w-full border-collapse text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Sales</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">IMEI</th>
              <th className="p-2 border">Harga</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Total</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((r, i) => {
              const total = (Number(r.QTY) || 0) * (Number(r.HARGA) || 0);
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-2 border">{r.TANGGAL}</td>
                  <td className="p-2 border">{r.TOKO}</td>
                  <td className="p-2 border">{r.NAMA_SALES}</td>
                  <td className="p-2 border">{r.BRAND}</td>
                  <td className="p-2 border">{r.IMEI}</td>
                  <td className="p-2 border text-right">
                    {Number(r.HARGA || 0).toLocaleString()}
                  </td>
                  <td className="p-2 border text-center">{r.QTY || 0}</td>
                  <td className="p-2 border text-right">{total.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <span>
          Halaman {currentPage} dari {totalPages} ({filteredData.length} data)
        </span>
        <div className="space-x-2">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* CHARTS */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        {/* BAR CHART TOKO */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-center">
            Diagram Batang Omzet Per Toko
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={omzetPerToko}>
              <XAxis dataKey="toko" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="omzet" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART SALES */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-center">
            Diagram Pie Omzet Per Sales
          </h3>
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
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TREND OMZET */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        {/* LINE CHART HARIAN */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-center">
            Tren Omzet Harian
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={omzetPerHari}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tanggal" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="omzet" stroke="#3B82F6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* LINE CHART BULANAN */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-center">
            Tren Omzet Bulanan
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={omzetPerBulan}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="omzet" stroke="#10B981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXPORT */}
      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
        >
          <FaFileExcel className="mr-2" /> Excel
        </button>
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-red-600 text-white rounded flex items-center"
        >
          <FaFilePdf className="mr-2" /> PDF
        </button>
      </div>
    </div>
  );
}
