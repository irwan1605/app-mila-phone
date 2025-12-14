// src/components/master-management/MasterKategoriBarangCard.jsx
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
  const [form, setForm] = useState({ namaKategori: "", deskripsi: "" });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = listenMasterKategoriBarang(setList);
    return () => unsub && unsub();
  }, []);

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

  const filtered = list.filter((i) =>
    i.namaKategori.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex justify-between mb-4">
        <h2 className="font-bold">MASTER KATEGORI BARANG</h2>
        <input
          placeholder="Cari..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-1 rounded"
        />
      </div>

      <div className="bg-slate-50 p-3 rounded mb-4">
        <input
          placeholder="Nama Kategori"
          value={form.namaKategori}
          onChange={(e) =>
            setForm({ ...form, namaKategori: e.target.value })
          }
          className="border p-2 rounded w-full mb-2"
        />
        <input
          placeholder="Deskripsi"
          value={form.deskripsi}
          onChange={(e) =>
            setForm({ ...form, deskripsi: e.target.value })
          }
          className="border p-2 rounded w-full"
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSubmit}
            className="bg-emerald-600 text-white px-4 py-2 rounded flex items-center gap-1"
          >
            {editId ? <FaSave /> : <FaPlus />}
            {editId ? "Simpan" : "Tambah"}
          </button>

          {editId && (
            <button
              onClick={resetForm}
              className="bg-slate-500 text-white px-4 py-2 rounded"
            >
              <FaTimes /> Batal
            </button>
          )}
        </div>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-slate-200">
          <tr>
            <th className="p-2">No</th>
            <th className="p-2">Nama</th>
            <th className="p-2">Deskripsi</th>
            <th className="p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, i) => (
            <tr key={item.id} className="border-t">
              <td className="p-2">{i + 1}</td>
              <td className="p-2">{item.namaKategori}</td>
              <td className="p-2">{item.deskripsi || "-"}</td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => {
                    setEditId(item.id);
                    setForm(item);
                  }}
                  className="text-blue-600"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => deleteMasterKategoriBarang(item.id)}
                  className="text-red-600"
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
