import React, { useEffect, useState } from "react";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { db } from "../../FirebaseInit";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { exportToExcel } from "../../utils/exportToExcel";

const basePath = "dataManagement/masterMDR";

export default function MasterMDRCard() {
  const [rows, setRows] = useState([]);
  const [nama, setNama] = useState("");
  const [persen, setPersen] = useState("");
  const [editId, setEditId] = useState(null);

  // ===============================
  // LISTENER FIREBASE
  // ===============================
  useEffect(() => {
    return onValue(ref(db, basePath), (snap) => {
      const val = snap.val() || {};
      setRows(Object.entries(val).map(([id, v]) => ({ id, ...v })));
    });
  }, []);

  // ===============================
  // EXPORT EXCEL (SESUAI TABLE)
  // ===============================
  const handleExport = () => {
    if (!rows || rows.length === 0) {
      alert("❌ Data kosong, tidak bisa export");
      return;
    }

    const formattedData = rows.map((r) => ({
      "Nama Payment": r.nama || "",
      "MDR (%)": Number(r.persen || 0),
    }));

    exportToExcel({
      data: formattedData,
      fileName: "MASTER_MDR",
      sheetName: "MDR",
    });
  };

  // ===============================
  // SAVE
  // ===============================
  const save = async () => {
    if (!nama || persen === "") {
      alert("Nama & MDR wajib diisi");
      return;
    }

    const payload = { nama, persen: Number(persen) };

    if (editId) {
      await update(ref(db, `${basePath}/${editId}`), payload);
    } else {
      const r = push(ref(db, basePath));
      await set(r, { id: r.key, ...payload });
    }

    setNama("");
    setPersen("");
    setEditId(null);
  };

  return (
    <div>
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-lg">MASTER MDR (%) & NAMA LEASING</h2>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700
                   text-white text-sm font-semibold shadow"
        >
          Export Excel
        </button>
      </div>

      {/* ================= FORM ================= */}
      <div className="flex gap-2 mb-4">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama Payment"
          className="border px-3 py-2 rounded w-full"
        />
        <input
          type="number"
          value={persen}
          onChange={(e) => setPersen(e.target.value)}
          placeholder="MDR %"
          className="border px-3 py-2 rounded w-32"
        />
        <button
          onClick={save}
          className="bg-indigo-600 text-white px-4 rounded flex items-center"
        >
          <FaPlus />
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <table className="w-full text-sm border">
        <thead className="bg-indigo-600 text-white">
          <tr>
            <th className="p-2">NO</th>
            <th className="p-2">NAMA LEASING</th>
            <th className="p-2">MDR %</th>
            <th className="p-2">AKSI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{r.nama}</td>
              <td className="p-2 text-center">{r.persen}%</td>
              <td className="p-2 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setEditId(r.id);
                    setNama(r.nama);
                    setPersen(r.persen);
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() =>
                    remove(ref(db, `${basePath}/${r.id}`))
                  }
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-4 text-slate-400">
                Belum ada data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
