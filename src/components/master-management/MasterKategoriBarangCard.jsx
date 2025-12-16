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
} from "react-icons/fa";

export default function MasterKategoriBarangCard() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({
    namaKategori: "",
    deskripsi: "",
  });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // ===============================
  // 🔄 LISTEN REALTIME KATEGORI
  // ===============================
  useEffect(() => {
    const unsub = listenMasterKategoriBarang((data) => {
      setList(Array.isArray(data) ? data : []);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // ===============================
  // 🔁 RESET FORM
  // ===============================
  const resetForm = () => {
    setForm({ namaKategori: "", deskripsi: "" });
    setEditId(null);
  };

  // ===============================
  // 💾 TAMBAH / UPDATE DATA
  // ===============================
  const handleSubmit = async () => {
    if (!form.namaKategori.trim()) {
      alert("❌ Nama kategori wajib diisi");
      return;
    }

    try {
      setLoading(true);

      // 🔒 CEK DUPLIKAT
      const exists = list.some(
        (i) =>
          i.namaKategori?.toLowerCase() ===
            form.namaKategori.toLowerCase() &&
          i.id !== editId
      );

      if (exists) {
        alert("⚠️ Kategori sudah ada");
        return;
      }

      if (editId) {
        await updateMasterKategoriBarang(editId, {
          ...form,
          updatedAt: Date.now(),
        });
      } else {
        await addMasterKategoriBarang({
          ...form,
          createdAt: Date.now(),
        });
      }

      resetForm();
    } catch (err) {
      console.error("❌ ERROR SIMPAN KATEGORI:", err);

      if (String(err?.message).includes("PERMISSION_DENIED")) {
        alert("❌ Firebase permission denied. Cek Rules Database!");
      } else {
        alert("❌ Terjadi kesalahan saat menyimpan data");
      }
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 🔍 FILTER SEARCH
  // ===============================
  const filtered = list.filter((i) =>
    i.namaKategori
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow p-5">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">
          MASTER KATEGORI BARANG
        </h2>
        <input
          placeholder="Cari kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-1 rounded"
        />
      </div>

      {/* FORM */}
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
            disabled={loading}
            className={`px-4 py-2 rounded flex items-center gap-1 text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-emerald-600"
            }`}
          >
            {editId ? <FaSave /> : <FaPlus />}
            {loading
              ? "Menyimpan..."
              : editId
              ? "Simpan"
              : "Tambah"}
          </button>

          {editId && (
            <button
              onClick={resetForm}
              className="bg-slate-500 text-white px-4 py-2 rounded flex items-center gap-1"
            >
              <FaTimes /> Batal
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full text-sm border">
        <thead className="bg-slate-200">
          <tr>
            <th className="p-2 w-12">No</th>
            <th className="p-2">Nama</th>
            <th className="p-2">Deskripsi</th>
            <th className="p-2 w-24">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan="4"
                className="p-4 text-center text-gray-400"
              >
                Tidak ada data
              </td>
            </tr>
          )}

          {filtered.map((item, i) => (
            <tr key={item.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{item.namaKategori}</td>
              <td className="p-2">
                {item.deskripsi || "-"}
              </td>
              <td className="p-2 space-x-2 text-center">
                <button
                  onClick={() => {
                    setEditId(item.id);
                    setForm({
                      namaKategori: item.namaKategori,
                      deskripsi: item.deskripsi || "",
                    });
                  }}
                  className="text-blue-600"
                >
                  <FaEdit />
                </button>

                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Hapus kategori "${item.namaKategori}"?\n\nPastikan tidak dipakai di Master Barang`
                      )
                    ) {
                      deleteMasterKategoriBarang(item.id);
                    }
                  }}
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
