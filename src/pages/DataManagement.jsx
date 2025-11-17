import React, { useEffect, useMemo, useState } from "react";
import {
  getAllData,
  updateDatabase,
  getAllToko,
  approveRecord,
} from "../data/database";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

export default function DataManagement() {
  const tokoList = getAllToko();

  const [data, setData] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [filterToko, setFilterToko] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setData(getAllData());
  }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = () => {
    const updated = editId
      ? data.map((r) => (r.id === editId ? { ...r, ...form } : r))
      : [...data, { id: Date.now(), ...form, STATUS: "Pending" }];
    setData(updated);
    updateDatabase(updated);
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
    if (window.confirm("Yakin hapus data ini?")) {
      const updated = data.filter((r) => r.id !== id);
      setData(updated);
      updateDatabase(updated);
    }
  };

  const handleApproval = (id, status) => {
    approveRecord(id, status);
    setData(getAllData());
  };

  const filteredData = useMemo(() => {
    return data.filter((r) => {
      const tokoMatch =
        filterToko === "semua" || r.TOKO === filterToko;
      const statusMatch =
        filterStatus === "semua" || r.STATUS === filterStatus;
      return tokoMatch && statusMatch;
    });
  }, [filterToko, filterStatus, data]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginated = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);

  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-3 text-gray-700">
        Data Management – Global Penjualan
      </h2>

      {/* FILTER */}
      <div className="flex items-center mb-4 space-x-3">
        <FaFilter />
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

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
          <div>
            <label>Toko</label>
            <select
              name="TOKO"
              value={form.TOKO || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Pilih Toko</option>
              {tokoList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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
            <label>Mesin</label>
            <input
              name="NO_MESIN"
              value={form.NO_MESIN || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label>Harga</label>
            <input
              name="HARGA"
              type="number"
              value={form.HARGA || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label>Qty</label>
            <input
              name="QTY"
              type="number"
              value={form.QTY || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded flex items-center"
        >
          <FaPlus className="mr-2" /> {editId ? "Update" : "Tambah"} Data
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">IMEI</th>
              <th className="p-2 border">Harga</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => {
              const total = (r.HARGA || 0) * (r.QTY || 0);
              return (
                <tr key={r.id}>
                  <td className="p-2 border">{r.TANGGAL}</td>
                  <td className="p-2 border">{r.TOKO}</td>
                  <td className="p-2 border">{r.BRAND}</td>
                  <td className="p-2 border">{r.IMEI}</td>
                  <td className="p-2 border text-right">
                    {Number(r.HARGA || 0).toLocaleString()}
                  </td>
                  <td className="p-2 border text-center">{r.QTY}</td>
                  <td className="p-2 border text-right">
                    {total.toLocaleString()}
                  </td>
                  <td
                    className={`p-2 border font-semibold ${
                      r.STATUS === "Approved"
                        ? "text-green-600"
                        : r.STATUS === "Rejected"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {r.STATUS}
                  </td>
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
                    <button
                      onClick={() => handleApproval(r.id, "Approved")}
                      className="text-green-600 hover:text-green-800"
                    >
                      <FaCheckCircle />
                    </button>
                    <button
                      onClick={() => handleApproval(r.id, "Rejected")}
                      className="text-orange-600 hover:text-orange-800"
                    >
                      <FaTimesCircle />
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
    </div>
  );
}
