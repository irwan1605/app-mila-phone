import React, { useEffect, useState } from "react";
import {
  addMasterKategoriBarang,
  listenMasterKategoriBarang,
  updateMasterKategoriBarang,
  deleteMasterKategoriBarang,
} from "../../services/FirebaseService";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaSearch,
} from "react-icons/fa";

export default function MasterKategoriBarangCard() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({
    namaKategori: "",
    deskripsi: "",
  });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  // ================= LISTENER =================
  useEffect(() => {
    const unsub = listenMasterKategoriBarang(setList);
    return () => unsub();
  }, []);

  // ================= ACTION =================
  const resetForm = () => {
    setForm({ namaKategori: "", deskripsi: "" });
    setEditId(null);
  };

  const handleSubmit = async () => {
    if (!form.namaKategori.trim()) {
      alert("Nama kategori wajib diisi");
      return;
    }

    if (editId) {
      await updateMasterKategoriBarang(editId, form);
    } else {
      await addMasterKategoriBarang(form);
    }
    resetForm();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setForm({
      namaKategori: item.namaKategori,
      deskripsi: item.deskripsi || "",
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Hapus kategori ini?")) {
      deleteMasterKategoriBarang(id);
    }
  };

  // ================= FILTER =================
  const filtered = list.filter((i) =>
    i.namaKategori.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-slate-800">
          MASTER KATEGORI BARANG
        </h2>

        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kategori..."
            className="pl-9 pr-3 py-2 rounded-lg border text-sm w-64"
          />
        </div>
      </div>

      {/* FORM */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4 border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={form.namaKategori}
            onChange={(e) =>
              setForm({ ...form, namaKategori: e.target.value })
            }
            placeholder="Nama Kategori Barang"
            className="px-3 py-2 rounded-lg border text-sm"
          />
          <input
            value={form.deskripsi}
            onChange={(e) =>
              setForm({ ...form, deskripsi: e.target.value })
            }
            placeholder="Deskripsi (opsional)"
            className="px-3 py-2 rounded-lg border text-sm"
          />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            {editId ? <FaSave /> : <FaPlus />}
            {editId ? "Simpan" : "Tambah"}
          </button>

          {editId && (
            <button
              onClick={resetForm}
              className="flex items-center gap-2 bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              <FaTimes /> Batal
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded-xl overflow-hidden">
          <thead className="bg-slate-200 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">No</th>
              <th className="px-3 py-2 text-left">Nama Kategori</th>
              <th className="px-3 py-2 text-left">Deskripsi</th>
              <th className="px-3 py-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="text-center py-4 text-slate-500"
                >
                  Data kosong
                </td>
              </tr>
            )}

            {filtered.map((item, i) => (
              <tr
                key={item.id}
                className="border-t hover:bg-slate-50"
              >
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 font-medium">
                  {item.namaKategori}
                </td>
                <td className="px-3 py-2">
                  {item.deskripsi || "-"}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
