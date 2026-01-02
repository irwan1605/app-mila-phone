import React, { useEffect, useState } from "react";
import {
  listenMasterKategoriBarang,
  addMasterKategoriBarang,
  updateMasterKategoriBarang,
  deleteMasterKategoriBarang,
} from "../../services/FirebaseService";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { exportToExcel } from "../../utils/exportToExcel";

export default function MasterKategoriBarangCard() {
  const [rows, setRows] = useState([]);
  const [namaKategori, setNamaKategori] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [editId, setEditId] = useState(null);

  // ===============================
  // LISTENER FIREBASE
  // ===============================
  useEffect(() => {
    const unsubscribe = listenMasterKategoriBarang((data) => {
      setRows(data || []);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  // ===============================
  // EXPORT EXCEL (SESUAI TABEL)
  // ===============================
  const handleExport = () => {
    if (!rows || rows.length === 0) {
      alert("❌ Data kosong, tidak bisa export");
      return;
    }

    // 🔥 FORMAT SESUAI KOLOM TABLE
    const formattedData = rows.map((r) => ({
      "Kategori Barang": r.namaKategori || "",
      Keterangan: r.keterangan || "",
    }));

    exportToExcel({
      data: formattedData,
      fileName: "MASTER_KATEGORI_BARANG",
      sheetName: "Kategori Barang",
    });
  };

  // ===============================
  // SIMPAN
  // ===============================
  const save = async () => {
    if (!namaKategori) {
      alert("Nama kategori wajib diisi");
      return;
    }

    const payload = {
      namaKategori,
      keterangan,
    };

    if (editId) {
      await updateMasterKategoriBarang(editId, payload);
    } else {
      await addMasterKategoriBarang(payload);
    }

    setNamaKategori("");
    setKeterangan("");
    setEditId(null);
  };

  return (
    <div>
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">MASTER KATEGORI BARANG</h2>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700
                   text-white text-sm font-semibold shadow"
        >
          Export Excel
        </button>
      </div>

      {/* ================= FORM ================= */}
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <input
          value={namaKategori}
          onChange={(e) => setNamaKategori(e.target.value)}
          placeholder="Nama Kategori Barang"
          className="border p-2 rounded"
        />
        <input
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Keterangan"
          className="border p-2 rounded"
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
            <th className="p-2 text-center">No</th>
            <th className="p-2">Kategori Barang</th>
            <th className="p-2">Keterangan</th>
            <th className="p-2 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{r.namaKategori}</td>
              <td className="p-2">{r.keterangan}</td>
              <td className="p-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setEditId(r.id);
                    setNamaKategori(r.namaKategori);
                    setKeterangan(r.keterangan || "");
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => deleteMasterKategoriBarang(r.id)}
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
