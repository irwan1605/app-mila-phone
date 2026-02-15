import React, { useEffect, useState } from "react";
import {
  listenMasterPaymentMetode,
  addMasterPaymentMetode,
  updateMasterPaymentMetode,
  deleteMasterPaymentMetode,
} from "../../services/FirebaseService";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { exportToExcel } from "../../utils/exportToExcel";

const PAYMENT_METODE_OPTIONS = [
  "CASH",
  "DEBIT",
  "QRIS",
  "VOUCHER",
  "TUKAR TAMBAH",
];

export default function MasterPaymentMetodeCard() {
  const [rows, setRows] = useState([]);
  const [nama, setNama] = useState("");
  const [paymentMetode, setPaymentMetode] = useState([]);
  const [inputText, setInputText] = useState("");
  const [editId, setEditId] = useState(null);

  /* ================= LISTENER REALTIME ================= */
  useEffect(() => {
    const unsub = listenMasterPaymentMetode((data) => {
      setRows(Array.isArray(data) ? data : []);
    });

    return () => unsub && unsub();
  }, []);

  /* ================= ADD METODE ================= */
  const addMetode = (val) => {
    if (!val) return;

    const metode = String(val).toUpperCase();

    if (paymentMetode.includes(metode)) return;

    setPaymentMetode((prev) => [...prev, metode]);
    setInputText("");
  };

  const removeMetode = (metode) => {
    setPaymentMetode((prev) => prev.filter((m) => m !== metode));
  };

  /* ================= EDIT ================= */
  const handleEdit = (row) => {
    setEditId(row.id);
    setNama(row.nama || "");
    setPaymentMetode(
      Array.isArray(row.paymentMetode)
        ? row.paymentMetode
        : row.paymentMetode
        ? [row.paymentMetode]
        : []
    );
  };

  /* ================= SAVE ================= */
  const save = async () => {
    if (!nama) return alert("Nama wajib diisi");

    const payload = {
      nama,
      paymentMetode,
    };

    try {
      if (editId) {
        await updateMasterPaymentMetode(editId, payload);
      } else {
        await addMasterPaymentMetode(payload);
      }

      setNama("");
      setPaymentMetode([]);
      setEditId(null);
    } catch (err) {
      console.error(err);
      alert("❌ Gagal menyimpan");
    }
  };

  /* ================= EXPORT ================= */
  const handleExport = () => {
    if (!rows.length) return alert("Data kosong");

    const formatted = rows.map((r) => ({
      Nama: r.nama || "",
      "Payment Metode": Array.isArray(r.paymentMetode)
        ? r.paymentMetode.join(", ")
        : "",
    }));

    exportToExcel({
      data: formatted,
      fileName: "MASTER_PAYMENT_METODE",
      sheetName: "Payment Metode",
    });
  };

  return (
    <div>
      <div className="flex justify-between mb-3">
        <h2 className="font-bold text-lg">MASTER PAYMENT METODE</h2>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-600 text-white rounded"
        >
          Export Excel
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama Payment"
          className="border px-3 py-2 rounded w-full"
        />

        <div className="flex gap-2">
          <select
            onChange={(e) => addMetode(e.target.value)}
            className="border px-3 py-2 rounded"
            value=""
          >
            <option value="">Pilih Metode</option>
            {PAYMENT_METODE_OPTIONS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>

          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tambah metode manual"
            className="border px-3 py-2 rounded w-full"
          />

          <button
            onClick={() => addMetode(inputText)}
            className="bg-indigo-600 text-white px-3 rounded"
          >
            +
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {paymentMetode.map((m) => (
            <span
              key={m}
              className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs"
            >
              {m}
              <button
                onClick={() => removeMetode(m)}
                className="ml-2 text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <button
          onClick={save}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          <FaPlus /> Simpan
        </button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-indigo-600 text-white">
          <tr>
            <th className="p-2">NO</th>
            <th className="p-2">NAMA</th>
            <th className="p-2">PAYMENT METODE</th>
            <th className="p-2">AKSI</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{r.nama}</td>
              <td className="p-2">
                {Array.isArray(r.paymentMetode)
                  ? r.paymentMetode.join(", ")
                  : "-"}
              </td>
              <td className="p-2 flex justify-center gap-2">
                <button onClick={() => handleEdit(r)}>
                  <FaEdit />
                </button>
                <button onClick={() => deleteMasterPaymentMetode(r.id)}>
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-4 text-gray-400">
                Belum ada data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
