import React, { useEffect, useState } from "react";
import {
  listenMasterToko,
  addMasterToko,
  updateMasterToko,
  deleteMasterToko,
} from "../../services/FirebaseService";

import {
  FaStore,
  FaEdit,
  FaSave,
  FaTrash,
  FaTimes,
  FaPlus,
} from "react-icons/fa";

export default function MasterTokoCard() {
  const [tokoList, setTokoList] = useState([]);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({ nama: "", alamat: "" });
  const [tambahForm, setTambahForm] = useState({ nama: "", alamat: "" });

  // =============================
  // 🔄 LISTENER REALTIME (SERVICE)
  // =============================
  useEffect(() => {
    const unsubscribe = listenMasterToko((list) => {
      setTokoList(list || []);
    });
  
    return () => unsubscribe && unsubscribe();
  }, []);
  
  

  // =============================
  // ➕ TAMBAH TOKO
  // =============================
  const tambahToko = async () => {
    if (!tambahForm.nama.trim()) {
      alert("Nama toko wajib diisi");
      return;
    }

    await addMasterToko({
      nama: tambahForm.nama.trim(),
      alamat: tambahForm.alamat.trim(),
    });

    setTambahForm({ nama: "", alamat: "" });
  };

  // =============================
  // ✏️ EDIT
  // =============================
  const startEdit = (toko) => {
    setEditId(toko.id);
    setForm({ nama: toko.nama || "", alamat: toko.alamat || "" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ nama: "", alamat: "" });
  };

  const saveEdit = async (id) => {
    if (!form.nama.trim()) {
      alert("Nama toko wajib diisi");
      return;
    }

    await updateMasterToko(id, {
      nama: form.nama.trim(),
      alamat: form.alamat.trim(),
    });

    cancelEdit();
  };

  // =============================
  // 🗑️ DELETE
  // =============================
  const handleDelete = async (id, nama) => {
    const ok = window.confirm(
      `Yakin hapus toko "${nama}"?\n\n⚠️ Data stok & transaksi bisa terpengaruh`
    );
    if (!ok) return;

    await deleteMasterToko(id);
  };

  // =============================
  // RENDER
  // =============================
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <FaStore className="text-2xl text-rose-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-800">MASTER TOKO</h2>
          <p className="text-sm text-slate-500">
            Daftar Nama Toko Mila Phone
          </p>
        </div>
      </div>

      {/* ➕ FORM TAMBAH */}
      {/* <div className="mb-4 p-4 border rounded-xl bg-slate-50">
        <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <FaPlus /> Tambah Toko
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nama Toko"
            value={tambahForm.nama}
            onChange={(e) =>
              setTambahForm({ ...tambahForm, nama: e.target.value })
            }
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Alamat (opsional)"
            value={tambahForm.alamat}
            onChange={(e) =>
              setTambahForm({ ...tambahForm, alamat: e.target.value })
            }
          />
          <button
            onClick={tambahToko}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded px-4 py-2 flex items-center justify-center gap-2"
          >
            <FaPlus /> Simpan
          </button>
        </div>
      </div> */}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-100 text-slate-700 text-sm">
            <tr>
              <th className="px-3 py-2 border">No</th>
              <th className="px-3 py-2 border">Nama Toko</th>
              <th className="px-3 py-2 border">Alamat</th>
              <th className="px-3 py-2 border text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {tokoList.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-6 text-slate-400">
                  Belum ada data toko
                </td>
              </tr>
            )}

            {tokoList.map((toko, i) => (
              <tr key={toko.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 border text-center">{i + 1}</td>

                <td className="px-3 py-2 border">
                  {editId === toko.id ? (
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={form.nama}
                      onChange={(e) =>
                        setForm({ ...form, nama: e.target.value })
                      }
                    />
                  ) : (
                    toko.nama
                  )}
                </td>

                <td className="px-3 py-2 border">
                  {editId === toko.id ? (
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={form.alamat}
                      onChange={(e) =>
                        setForm({ ...form, alamat: e.target.value })
                      }
                    />
                  ) : (
                    toko.alamat || "-"
                  )}
                </td>

                <td className="px-3 py-2 border text-center">
                  {editId === toko.id ? (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => saveEdit(toko.id)}
                        className="bg-emerald-500 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <FaSave /> Simpan
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-slate-400 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <FaTimes /> Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => startEdit(toko)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(toko.id, toko.nama)}
                        className="bg-rose-500 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <FaTrash /> Hapus
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
