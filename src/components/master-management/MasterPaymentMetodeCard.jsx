import React, { useEffect, useState } from "react";
import {
  listenMasterPaymentMetode,
  addMasterPaymentMetode,
  updateMasterPaymentMetode,
  deleteMasterPaymentMetode,
} from "../../services/FirebaseService";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { exportToExcel } from "../../utils/exportToExcel";

export default function MasterPaymentMetodeCard() {
  const [rows, setRows] = useState([]);
  const [nama, setNama] = useState("");
  const [editId, setEditId] = useState(null);

  // ===============================
  // LISTENER
  // ===============================
  useEffect(() => {
    const unsub = listenMasterPaymentMetode((data) => {
      setRows(data || []);
    });
    return () => unsub && unsub();
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
      "Nama Payment Metode": r.nama || "",
    }));

    exportToExcel({
      data: formattedData,
      fileName: "MASTER_PAYMENT_METODE",
      sheetName: "Payment Metode",
    });
  };

  // ===============================
  // SAVE
  // ===============================
  const save = async () => {
    if (!nama) {
      alert("Nama wajib diisi");
      return;
    }

    if (editId) {
      await updateMasterPaymentMetode(editId, { nama });
    } else {
      await addMasterPaymentMetode({ nama });
    }

    setNama("");
    setEditId(null);
  };

  return (
    <div>
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-lg">MASTER PAYMENT METODE</h2>

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
          placeholder="Nama Payment Metode"
          className="border px-3 py-2 rounded w-full"
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
            <th className="p-2">NAMA</th>
            <th className="p-2">AKSI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{r.nama}</td>
              <td className="p-2 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setEditId(r.id);
                    setNama(r.nama);
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => deleteMasterPaymentMetode(r.id)}
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-slate-400">
                Belum ada data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
