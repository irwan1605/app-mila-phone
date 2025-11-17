// DashboardToko.jsx — FINAL REALTIME FIREBASE (UI TIDAK DIUBAH)
import React, { useEffect, useState, useMemo } from "react";
import {
  listenTransaksiByToko,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  getTokoName,
} from "../services/FirebaseService";

import {
  FaPlus,
  FaEdit,
  FaTrash,
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
} from "recharts";

export default function DashboardToko({ tokoId }) {
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

  const [tokoName, setTokoName] = useState("Loading...");
  const [data, setData] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);

  const [filterType, setFilterType] = useState("semua");
  const [filterValue, setFilterValue] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  /* -------------------------------------------
      1. LOAD NAMA TOKO + LISTENER REALTIME
  ------------------------------------------- */
  useEffect(() => {
    getTokoName(tokoId).then((name) => {
      if (name) setTokoName(name);
      else setTokoName(fallbackTokoNames[tokoId - 1] || `Toko ${tokoId}`);
    });

    const unsub = listenTransaksiByToko(tokoId, (items) => {
      const formatted = items.map((r) => ({
        id: r.id,
        TANGGAL: r.TANGGAL || "",
        BRAND: r.BRAND || "",
        IMEI: r.IMEI || "",
        NO_MESIN: r.NO_MESIN || "",
        QTY: Number(r.QTY || 0),
        HARGA: Number(r.HARGA || 0),
      }));

      setData(formatted);
      setCurrentPage(1);
    });

    return () => unsub();
  }, [tokoId]);

  /* -------------------------------------------
      2. FORM HANDLING
  ------------------------------------------- */
  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    if (!form.TANGGAL || !form.BRAND || !form.HARGA) {
      alert("Isi minimal Tanggal, BRAND dan HARGA");
      return;
    }

    const payload = {
      ...form,
      QTY: Number(form.QTY || 0),
      HARGA: Number(form.HARGA || 0),
    };

    if (editId) updateTransaksi(tokoId, editId, payload);
    else addTransaksi(tokoId, payload);

    setForm({});
    setEditId(null);
  };

  const handleEdit = (row) => {
    setForm({ ...row });
    setEditId(row.id);
  };

  const handleDelete = (id) => {
    if (window.confirm("Hapus data ini?")) deleteTransaksi(tokoId, id);
  };

  /* -------------------------------------------
      3. FILTER
  ------------------------------------------- */
  const filteredData = useMemo(() => {
    if (filterType === "semua" || !filterValue) return data;

    return data.filter((r) => {
      const d = new Date(r.TANGGAL);
      const v = new Date(filterValue);

      if (filterType === "hari") {
        return d.toISOString().slice(0, 10) === v.toISOString().slice(0, 10);
      }

      if (filterType === "bulan") {
        return (
          d.getFullYear() === v.getFullYear() &&
          d.getMonth() === v.getMonth()
        );
      }

      if (filterType === "tahun") {
        return d.getFullYear() === v.getFullYear();
      }

      return true;
    });
  }, [data, filterType, filterValue]);

  /* -------------------------------------------
      4. PAGINATION
  ------------------------------------------- */
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginated = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  /* -------------------------------------------
      5. OMZET
  ------------------------------------------- */
  const totalOmzet = filteredData.reduce(
    (sum, r) => sum + r.QTY * r.HARGA,
    0
  );

  /* -------------------------------------------
      6. CHART DATA
  ------------------------------------------- */
  const chartData = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const brand = r.BRAND || "Lainnya";
      const omzet = r.QTY * r.HARGA;
      map[brand] = (map[brand] || 0) + omzet;
    });

    return Object.entries(map).map(([brand, omzet]) => ({ brand, omzet }));
  }, [filteredData]);

  const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6"];

  /* -------------------------------------------
      7. EXPORT
  ------------------------------------------- */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tokoName);
    XLSX.writeFile(wb, `Laporan_${tokoName}.xlsx`);
  };

  const exportPDF = () => {
    const el = document.getElementById("tokoTable");
    html2canvas(el).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`Laporan_${tokoName}.pdf`);
    });
  };

  /* -------------------------------------------
      8. UI (TIDAK DIUBAH)
  ------------------------------------------- */

  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-3">
        Dashboard Penjualan Toko – {tokoName}
      </h2>

      {/* FORM INPUT */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-3 gap-3">

          <div>
            <label>Tanggal</label>
            <input
              type="date"
              name="TANGGAL"
              value={form.TANGGAL || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Brand</label>
            <input
              name="BRAND"
              value={form.BRAND || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>IMEI</label>
            <input
              name="IMEI"
              value={form.IMEI || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>No Mesin</label>
            <input
              name="NO_MESIN"
              value={form.NO_MESIN || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Qty</label>
            <input
              type="number"
              name="QTY"
              value={form.QTY || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Harga</label>
            <input
              type="number"
              name="HARGA"
              value={form.HARGA || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

        </div>

        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded flex items-center"
        >
          <FaPlus className="mr-2" />
          {editId ? "Update" : "Tambah"} Data
        </button>
      </div>

      {/* FILTER */}
      <div className="flex items-center mb-4 space-x-3">
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
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto" id="tokoTable">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">IMEI</th>
              <th className="p-2 border">Mesin</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Harga</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((r) => {
              const total = r.QTY * r.HARGA;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{r.TANGGAL}</td>
                  <td className="p-2 border">{r.BRAND}</td>
                  <td className="p-2 border">{r.IMEI}</td>
                  <td className="p-2 border">{r.NO_MESIN}</td>
                  <td className="p-2 border text-center">{r.QTY}</td>
                  <td className="p-2 border text-right">
                    {r.HARGA.toLocaleString()}
                  </td>
                  <td className="p-2 border text-right">
                    {total.toLocaleString()}
                  </td>
                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => handleEdit(r)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-3">
        <span>
          Halaman {currentPage} dari {totalPages}
        </span>

        <div>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-2 py-1 border rounded mr-2 disabled:opacity-40"
          >
            <FaChevronLeft />
          </button>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* OMZET */}
      <div className="text-right mt-4 text-lg font-semibold">
        Total Omzet: Rp {totalOmzet.toLocaleString("id-ID")}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-2 gap-4 mt-6">

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3 text-center">Diagram Batang Omzet</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="brand" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="omzet" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3 text-center">
            Diagram Pie Omzet
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="omzet"
                nameKey="brand"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* EXPORT */}
      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={exportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
        >
          <FaFileExcel className="mr-2" /> Excel
        </button>

        <button
          onClick={exportPDF}
          className="px-4 py-2 bg-red-600 text-white rounded flex items-center"
        >
          <FaFilePdf className="mr-2" /> PDF
        </button>
      </div>

    </div>
  );
}
