import React, { useEffect, useState } from "react";
import {
  listenMasterBarangByKategori,
  addMasterBarang,
  updateMasterBarang,
  deleteMasterBarangMasing,
} from "../../services/FirebaseService";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

export default function MasterBarangKategoriCard({ kategori }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    namaBrand: "",
    namaBarang: "",
    sku: "",
    hasIMEI: false,
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const unsub = listenMasterBarangByKategori(kategori, setRows);
    return () => unsub && unsub();
  }, [kategori]);

  const save = async () => {
    if (!form.namaBarang) return alert("Nama barang wajib");

    const payload = {
      ...form,
      kategoriBarang: kategori,
    };

    if (editId) {
      await updateMasterBarang(editId, payload);
    } else {
      await addMasterBarang(payload);
    }

    setForm({ namaBrand: "", namaBarang: "", sku: "", hasIMEI: false });
    setEditId(null);
  };

  return (
    <div>
      <h2 className="font-bold mb-3">MASTER BARANG – {kategori}</h2>

      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <input
          placeholder="Nama Brand"
          value={form.namaBrand}
          onChange={(e) => setForm({ ...form, namaBrand: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Nama Barang"
          value={form.namaBarang}
          onChange={(e) => setForm({ ...form, namaBarang: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          className="border p-2 rounded"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.hasIMEI}
            onChange={(e) => setForm({ ...form, hasIMEI: e.target.checked })}
          />
          Pakai IMEI
        </label>
      </div>

      <button
        onClick={save}
        className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded"
      >
        <FaPlus /> Simpan
      </button>

      <table className="w-full text-sm border">
        <thead className="bg-slate-200">
          <tr>
            <th className="p-2">No</th>
            <th className="p-2">Brand</th>
            <th className="p-2">Nama Barang</th>
            <th className="p-2">SKU</th>
            <th className="p-2">IMEI</th>
            <th className="p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{r.namaBrand}</td>
              <td className="p-2">{r.namaBarang}</td>
              <td className="p-2">{r.sku}</td>
              <td className="p-2 text-center">
                {r.hasIMEI ? "YA" : "TIDAK"}
              </td>
              <td className="p-2 flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setEditId(r.id);
                    setForm(r);
                  }}
                >
                  <FaEdit />
                </button>
                <button onClick={() => deleteMasterBarangMasing(r.id)}>
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
