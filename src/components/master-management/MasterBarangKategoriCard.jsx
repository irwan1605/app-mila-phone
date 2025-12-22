import React, { useEffect, useState } from "react";
import { onValue, ref, off } from "firebase/database";
import {
  addMasterBarang,
  updateMasterBarang,
  deleteMasterBarangMasing,
} from "../../services/FirebaseService";
import { db } from "../../firebase/FirebaseInit";

export default function MasterBarangKategoriCard({ kategori }) {
  // ===============================
  // STATE FORM (SATU SUMBER DATA)
  // ===============================
  const [barang, setBarang] = useState({
    brand: "",
    namaBarang: "",
    harga: {
      srp: "",
      grosir: "",
      reseller: "",
    },
  });

  const [listBarang, setListBarang] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  // ===============================
  // REALTIME LISTENER
  // ===============================
  useEffect(() => {
    const barangRef = ref(db, "dataManagement/masterBarang");
  
    onValue(barangRef, (snap) => {
      const data = snap.val() || {};
      const filtered = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter(
          (b) => b.kategoriBarang === kategori.trim().toUpperCase()
        );
  
      setListBarang(filtered);
    });
  
    return () => off(barangRef);
  }, [kategori]);
  
  

  // ===============================
  // RESET FORM
  // ===============================
  const resetForm = () => {
    setBarang({
      brand: "",
      namaBarang: "",
      harga: { srp: "", grosir: "", reseller: "" },
    });
    setEditId(null);
  };

  // ===============================
  // SUBMIT (ADD / UPDATE)
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !barang.brand ||
      !barang.namaBarang ||
      !barang.harga.srp ||
      !barang.harga.grosir ||
      !barang.harga.reseller
    ) {
      alert("Lengkapi semua field!");
      return;
    }

    setLoading(true);

    const payload = {
      kategoriBarang: kategori.trim().toUpperCase(),
      brand: barang.brand.trim(),
      namaBarang: barang.namaBarang.trim(),
      harga: {
        srp: Number(barang.harga.srp),
        grosir: Number(barang.harga.grosir),
        reseller: Number(barang.harga.reseller),
      },
    };
    

    try {
      if (editId) {
        await updateMasterBarang(editId, payload);
      } else {
        await addMasterBarang(payload);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // EDIT
  // ===============================
  const handleEdit = (item) => {
    setEditId(item.id);
    setBarang({
      brand: item.brand,
      namaBarang: item.namaBarang,
      harga: {
        srp: item.harga?.srp || "",
        grosir: item.harga?.grosir || "",
        reseller: item.harga?.reseller || "",
      },
    });
  };

  // ===============================
  // DELETE
  // ===============================
  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus data ini?")) return;
    await deleteMasterBarangMasing(id);
  };

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">
          MASTER BARANG — {kategori}
        </h2>
        <p className="text-sm text-slate-500">
          Simpan, Edit, Delete langsung realtime ke Firebase
        </p>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border"
      >
        <input
          className="input border p-2 rounded"
          placeholder="Nama Brand"
          value={barang.brand}
          onChange={(e) => setBarang({ ...barang, brand: e.target.value })}
        />

        <input
          className="input border p-2 rounded"
          placeholder="Nama Barang"
          value={barang.namaBarang}
          onChange={(e) =>
            setBarang({ ...barang, namaBarang: e.target.value })
          }
        />

        <input
          type="number"
          className="input border p-2 rounded"
          placeholder="Harga SRP"
          value={barang.harga.srp}
          onChange={(e) =>
            setBarang({
              ...barang,
              harga: { ...barang.harga, srp: e.target.value },
            })
          }
        />

        <input
          type="number"
          className="input border p-2 rounded"
          placeholder="Harga Grosir"
          value={barang.harga.grosir}
          onChange={(e) =>
            setBarang({
              ...barang,
              harga: { ...barang.harga, grosir: e.target.value },
            })
          }
        />

        <input
          type="number"
          className="input border p-2 rounded"
          placeholder="Harga Reseller"
          value={barang.harga.reseller}
          onChange={(e) =>
            setBarang({
              ...barang,
              harga: { ...barang.harga, reseller: e.target.value },
            })
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white rounded py-2 hover:bg-indigo-700"
        >
          {editId ? "Update" : "Simpan"}
        </button>

        {editId && (
          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-400 text-white rounded py-2"
          >
            Batal
          </button>
        )}
      </form>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="border px-3 py-2">Brand</th>
              <th className="border px-3 py-2">Nama Barang</th>
              <th className="border px-3 py-2">SRP</th>
              <th className="border px-3 py-2">Grosir</th>
              <th className="border px-3 py-2">Reseller</th>
              <th className="border px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {listBarang.map((b) => (
              <tr key={b.id}>
                <td className="border px-3 py-2">{b.brand}</td>
                <td className="border px-3 py-2">{b.namaBarang}</td>
                <td className="border px-3 py-2">
                  {b.harga?.srp?.toLocaleString()}
                </td>
                <td className="border px-3 py-2">
                  {b.harga?.grosir?.toLocaleString()}
                </td>
                <td className="border px-3 py-2">
                  {b.harga?.reseller?.toLocaleString()}
                </td>
                <td className="border px-3 py-2 space-x-2">
                  <button
                    onClick={() => handleEdit(b)}
                    className="px-2 py-1 bg-amber-500 text-white rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {listBarang.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-slate-400">
                  Belum ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
