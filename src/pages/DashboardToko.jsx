import React, { useEffect, useMemo, useState } from "react";
import {
  getDataByToko,
  getAllToko,
  addRecord,
  editRecord,
  deleteRecord,
  getDropdownOptions,
} from "../data/database";
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
  const tokoList = getAllToko();
  const tokoName = tokoList[tokoId - 1] || "CILANGKAP";

  const [data, setData] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [filterType, setFilterType] = useState("semua");
  const [filterValue, setFilterValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [options, setOptions] = useState(getDropdownOptions());

  useEffect(() => {
    setData(getDataByToko(tokoName));
    setOptions(getDropdownOptions());
  }, [tokoName]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = () => {
    if (editId) {
      editRecord(editId, form);
    } else {
      addRecord({ ...form, TOKO: tokoName });
    }
    setData(getDataByToko(tokoName));
    setForm({});
    setEditId(null);
  };

  const handleEdit = (id) => {
    const d = data.find((r) => r.id === id);
    if (d) {
      setForm(d);
      setEditId(id);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Yakin ingin menghapus data ini?")) {
      deleteRecord(id);
      setData(getDataByToko(tokoName));
    }
  };

  const filteredData = useMemo(() => {
    if (filterType === "semua" || !filterValue) return data;
    return data.filter((r) => {
      const date = new Date(r.TANGGAL);
      const val = new Date(filterValue);
      if (filterType === "hari")
        return date.toISOString().slice(0, 10) === val.toISOString().slice(0, 10);
      if (filterType === "bulan")
        return (
          date.getFullYear() === val.getFullYear() &&
          date.getMonth() === val.getMonth()
        );
      if (filterType === "tahun") return date.getFullYear() === val.getFullYear();
      return true;
    });
  }, [data, filterType, filterValue]);

  const totalOmzet = filteredData.reduce(
    (sum, r) => sum + (Number(r.QTY) || 0) * (Number(r.HARGA) || 0),
    0
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);

  const chartData = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const brand = r.BRAND || "Lainnya";
      const omzet = (Number(r.QTY) || 0) * (Number(r.HARGA) || 0);
      map[brand] = (map[brand] || 0) + omzet;
    });
    return Object.entries(map).map(([brand, omzet]) => ({ brand, omzet }));
  }, [filteredData]);

  const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"];

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tokoName);
    XLSX.writeFile(wb, `Laporan_${tokoName}.xlsx`);
  };

  const handleExportPDF = () => {
    const input = document.getElementById("tokoTable");
    html2canvas(input).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`Laporan_${tokoName}.pdf`);
    });
  };

  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-3 text-gray-700">
        Dashboard Penjualan Toko - {tokoName}
      </h2>

      {/* FORM */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
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

          {Object.keys(options).map((key) => (
            <div key={key}>
              <label>{key}</label>
              <input
                list={`${key}-list`}
                name={key}
                value={form[key] || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
              <datalist id={`${key}-list`}>
                {options[key].map((val) => (
                  <option key={val} value={val} />
                ))}
              </datalist>
            </div>
          ))}

          <div>
            <label>No IMEI</label>
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
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
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
      <div className="bg-white rounded-lg shadow overflow-x-auto" id="tokoTable">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">IMEI</th>
              <th className="p-2 border">Mesin</th>
              <th className="p-2 border">Payment</th>
              <th className="p-2 border">Harga</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((r) => {
              const total = (Number(r.QTY) || 0) * (Number(r.HARGA) || 0);
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{r.TANGGAL}</td>
                  <td className="p-2 border">{r.BRAND}</td>
                  <td className="p-2 border">{r.IMEI}</td>
                  <td className="p-2 border">{r.NO_MESIN}</td>
                  <td className="p-2 border">{r.PAYMENT_METODE}</td>
                  <td className="p-2 border text-right">
                    {Number(r.HARGA || 0).toLocaleString()}
                  </td>
                  <td className="p-2 border text-center">{r.QTY || 0}</td>
                  <td className="p-2 border text-right">{total.toLocaleString()}</td>
                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => handleEdit(r.id)}
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

      <div className="text-right mt-4 text-lg font-semibold text-gray-700">
        Total Omzet: Rp {totalOmzet.toLocaleString("id-ID")}
      </div>

      {/* CHART */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
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
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-center">Diagram Pie Omzet</h3>
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
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXPORT BUTTONS */}
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
