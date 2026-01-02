import React, { useEffect, useState } from "react";
import {
  listenMasterBarangBundling,
  addMasterBarangBundling,
  updateMasterBarangBundling,
  deleteMasterBarangBundling,
  listenMasterBarang,
} from "../../services/FirebaseService";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { exportToExcel } from "../../utils/exportToExcel";

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
    const unsubBundling = listenMasterBarangBundling((data) => {
      setRows(data || []);
    });
    const unsubBarang = listenMasterBarang(setMasterBarang);

    return () => {
      unsubBundling && unsubBundling();
      unsubBarang && unsubBarang();
    };
  }, []);

  // ===============================
  // RULE HARGA BUNDLING
  // ===============================
  useEffect(() => {
    if (
      form.kategoriBarang === "MOTOR LISTRIK" ||
      form.kategoriBarang === "SEPEDA LISTRIK"
    ) {
      setForm((f) => ({ ...f, hargaBundling: 0 }));
      return;
    }

    if (form.kategoriBarang === "ACCESSORIES" && form.namaBarang) {
      const found = masterBarang.find(
        (b) =>
          b.kategoriBarang === "ACCESSORIES" &&
          b.namaBarang === form.namaBarang
      );

      if (found) {
        setForm((f) => ({
          ...f,
          hargaBundling: Number(found.harga || found.hargaUnit || 0),
        }));
      }
    }
  }, [form.kategoriBarang, form.namaBarang, masterBarang]);

  // ===============================
  // OPTIONS BARANG (ACCESSORIES)
  // ===============================
  const barangOptions = masterBarang.filter(
    (b) => b.kategoriBarang === "ACCESSORIES"
  );

  // ===============================
  // EXPORT EXCEL (SESUAI TABLE)
  // ===============================
  const handleExport = () => {
    if (!rows || rows.length === 0) {
      alert("❌ Data kosong, tidak bisa export");
      return;
    }

    const formattedData = rows.map((r) => ({
      "Kategori Induk": r.kategoriBarang || "",
      "Barang Bundling": r.namaBarang || "",
      "Harga Bundling": Number(r.hargaBundling || 0),
    }));

    exportToExcel({
      data: formattedData,
      fileName: "MASTER_BARANG_BUNDLING",
      sheetName: "Barang Bundling",
    });
  };

  // ===============================
  // SAVE
  // ===============================
  const save = async () => {
    if (!form.namaBarang) {
      alert("Nama barang bundling wajib dipilih");
      return;
    }

    const payload = {
      kategoriBarang: form.kategoriBarang,
      namaBarang: form.namaBarang,
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
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">MASTER BARANG BUNDLING</h2>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700
                   text-white text-sm font-semibold shadow"
        >
          Export Excel
        </button>
      </div>

      {/* ================= FORM ================= */}
      <div className="grid md:grid-cols-3 gap-3 mb-3">
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
        className="bg-indigo-600 text-white px-4 py-2 rounded mb-4 flex items-center gap-2"
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
                Rp {Number(r.hargaBundling || 0).toLocaleString("id-ID")}
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

          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-4 text-slate-400">
                Belum ada data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
