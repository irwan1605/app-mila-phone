import React, { useEffect, useState } from "react";
import {
  listenMasterBarangBundling,
  addMasterBarangBundling,
  updateMasterBarangBundling,
  deleteMasterBarangBundling,
  listenMasterBarang,
} from "../../services/FirebaseService";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const KATEGORI_INDUK = [
  "MOTOR LISTRIK",
  "SEPEDA LISTRIK",
  "ACCESSORIES",
];

export default function MasterBarangBundlingCard() {
  const [rows, setRows] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);

  const [form, setForm] = useState({
    kategoriBarang: "MOTOR LISTRIK",
    namaBarang: "",
    hargaBundling: 0,
  });

  const [editId, setEditId] = useState(null);

  // ===============================
  // LISTENER FIREBASE
  // ===============================
  useEffect(() => {
    const unsubBundling = listenMasterBarangBundling(setRows);
    const unsubBarang = listenMasterBarang(setMasterBarang);

    return () => {
      unsubBundling && unsubBundling();
      unsubBarang && unsubBarang();
    };
  }, []);

  // ===============================
  // RULE HARGA BUNDLING (FINAL)
  // ===============================
  useEffect(() => {
    // MOTOR & SEPEDA → harga bundling WAJIB 0
    if (
      form.kategoriBarang === "MOTOR LISTRIK" ||
      form.kategoriBarang === "SEPEDA LISTRIK"
    ) {
      setForm((f) => ({ ...f, hargaBundling: 0 }));
      return;
    }

    // ACCESSORIES → harga dari master barang accessories
    if (form.kategoriBarang === "ACCESSORIES" && form.namaBarang) {
      const found = masterBarang.find(
        (b) =>
          b.kategoriBarang === "ACCESSORIES" &&
          b.namaBarang === form.namaBarang
      );

      if (found) {
        setForm((f) => ({
          ...f,
          hargaBundling: Number(
            found.harga || found.hargaUnit || 0
          ),
        }));
      }
    }
  }, [form.kategoriBarang, form.namaBarang, masterBarang]);

  // ===============================
  // BARANG BUNDLING → SELALU ACCESSORIES
  // ===============================
  const barangOptions = masterBarang.filter(
    (b) => b.kategoriBarang === "ACCESSORIES"
  );

  // ===============================
  // SAVE
  // ===============================
  const save = async () => {
    if (!form.namaBarang) {
      alert("Nama barang bundling wajib dipilih");
      return;
    }

    const payload = {
      kategoriBarang: form.kategoriBarang, // kategori induk
      namaBarang: form.namaBarang,         // selalu accessories
      hargaBundling: Number(form.hargaBundling || 0),
    };

    if (editId) {
      await updateMasterBarangBundling(editId, payload);
    } else {
      await addMasterBarangBundling(payload);
    }

    setForm({
      kategoriBarang: "MOTOR LISTRIK",
      namaBarang: "",
      hargaBundling: 0,
    });
    setEditId(null);
  };

  return (
    <div>
      <h2 className="font-bold mb-4">MASTER BARANG BUNDLING</h2>

      {/* ================= FORM ================= */}
      <div className="grid md:grid-cols-3 gap-3 mb-3">
        {/* KATEGORI INDUK */}
        <select
          value={form.kategoriBarang}
          onChange={(e) =>
            setForm({ ...form, kategoriBarang: e.target.value })
          }
          className="border p-2 rounded"
        >
          {KATEGORI_INDUK.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        {/* BARANG BUNDLING (ACCESSORIES) */}
        <select
          value={form.namaBarang}
          onChange={(e) =>
            setForm({ ...form, namaBarang: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">
            -- Pilih Barang Accessories (Bundling) --
          </option>
          {barangOptions.map((b) => (
            <option key={b.id} value={b.namaBarang}>
              {b.namaBarang}
            </option>
          ))}
        </select>

        {/* HARGA BUNDLING (AUTO) */}
        <input
          type="number"
          value={form.hargaBundling}
          disabled
          className="border p-2 rounded bg-gray-100"
          placeholder="Harga otomatis"
        />
      </div>

      <button
        onClick={save}
        className="bg-indigo-600 text-white px-4 py-2 rounded mb-4"
      >
        <FaPlus /> Simpan
      </button>

      {/* ================= TABLE ================= */}
      <table className="w-full text-sm border">
        <thead className="bg-slate-200">
          <tr>
            <th className="p-2">No</th>
            <th className="p-2">Kategori Induk</th>
            <th className="p-2">Barang Bundling (Accessories)</th>
            <th className="p-2">Harga Bundling</th>
            <th className="p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{r.kategoriBarang}</td>
              <td className="p-2">{r.namaBarang}</td>
              <td className="p-2">
                Rp{" "}
                {Number(r.hargaBundling || 0).toLocaleString("id-ID")}
              </td>
              <td className="p-2 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setEditId(r.id);
                    setForm({
                      kategoriBarang: r.kategoriBarang,
                      namaBarang: r.namaBarang,
                      hargaBundling: r.hargaBundling,
                    });
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => deleteMasterBarangBundling(r.id)}
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
