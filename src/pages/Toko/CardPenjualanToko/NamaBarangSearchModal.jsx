import React, { useEffect, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { getInventoryByName } from "../../../services/FirebaseService"; // pastikan fungsi ini ada

export default function NamaBarangSearchModal({ onClose, onSelect }) {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  // ============================
  // HANDLE SEARCH
  // ============================
  const handleSearch = async () => {
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      const items = await getInventoryByName(keyword.trim().toLowerCase());
      setResults(items || []);
    } catch (err) {
      console.error("Search error:", err);
    }
    setLoading(false);
  };

  // ============================
  // SELECT ROW
  // ============================
  const toggleSelect = (item) => {
    setSelectedRows((prev) => {
      const exists = prev.find((x) => x.imei === item.imei);
      if (exists) return prev.filter((x) => x.imei !== item.imei);
      return [...prev, item];
    });
  };

  // ============================
  // SUBMIT
  // ============================
  const handleSubmit = () => {
    if (selectedRows.length === 0) return onClose();
    onSelect(selectedRows);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-lg p-5">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Cari Nama Barang</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Masukkan nama barang..."
            className="flex-1 border rounded-lg p-2 text-sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"
          >
            <FaSearch /> Cari
          </button>
        </div>

        {/* RESULTS */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2">Pilih</th>
                <th className="border p-2">Nama Barang</th>
                <th className="border p-2">Brand</th>
                <th className="border p-2">Kategori</th>
                <th className="border p-2">IMEI</th>
                <th className="border p-2">Harga</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-500">
                    Mencari...
                  </td>
                </tr>
              )}

              {!loading && results.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-500">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              )}

              {results.map((item, idx) => {
                const isSelected = selectedRows.some((x) => x.imei === item.imei);
                return (
                  <tr
                    key={idx}
                    className={`cursor-pointer ${
                      isSelected ? "bg-indigo-100" : ""
                    }`}
                    onClick={() => toggleSelect(item)}
                  >
                    <td className="border p-2 text-center">
                      <input type="checkbox" checked={isSelected} readOnly />
                    </td>
                    <td className="border p-2">{item.namaBarang}</td>
                    <td className="border p-2">{item.namaBrand}</td>
                    <td className="border p-2">{item.kategoriBarang}</td>
                    <td className="border p-2 whitespace-pre">{item.imei}</td>
                    <td className="border p-2 text-right">
                      {Number(item.hargaUnit || 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER BUTTONS */}
        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-sm"
          >
            Batal
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
          >
            Gunakan Barang Terpilih
          </button>
        </div>
      </div>
    </div>
  );
}
