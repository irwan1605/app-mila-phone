import React, { useEffect, useState } from "react";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { db } from "../../FirebaseInit";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { exportToExcel } from "../../utils/exportToExcel";

const basePath = "dataManagement/masterVoucher";

export default function MasterVoucherCard() {
  const [rows, setRows] = useState([]);
  const [kode, setKode] = useState("");
  const [nominal, setNominal] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    return onValue(ref(db, basePath), (snap) => {
      const val = snap.val() || {};
      setRows(Object.entries(val).map(([id, v]) => ({ id, ...v })));
    });
  }, []);

  const save = async () => {
    if (!kode || nominal === "") return alert("Kode & Nominal wajib");

    const payload = { kode, nominal: Number(nominal) };

    if (editId) {
      await update(ref(db, `${basePath}/${editId}`), payload);
    } else {
      const r = push(ref(db, basePath));
      await set(r, { id: r.key, ...payload });
    }

    setKode("");
    setNominal("");
    setEditId(null);
  };

  return (
    <div>
      <h2 className="font-bold mb-3">MASTER VOUCHER</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          placeholder="Kode Voucher"
          className="border px-3 py-2 rounded w-full"
        />
        <input
          type="number"
          value={nominal}
          onChange={(e) => setNominal(e.target.value)}
          placeholder="Nominal"
          className="border px-3 py-2 rounded w-40"
        />
        <button onClick={save} className="bg-indigo-600 text-white px-4 rounded">
          <FaPlus />
        </button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-indigo-600 text-white">
          <tr>
            <th className="p-2">NO</th>
            <th className="p-2">KODE</th>
            <th className="p-2">NOMINAL</th>
            <th className="p-2">AKSI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{r.kode}</td>
              <td className="p-2 text-right">
                Rp {Number(r.nominal || 0).toLocaleString("id-ID")}
              </td>
              <td className="p-2 flex justify-center gap-2">
                <button onClick={() => { setEditId(r.id); setKode(r.kode); setNominal(r.nominal); }}>
                  <FaEdit />
                </button>
                <button onClick={() => remove(ref(db, `${basePath}/${r.id}`))}>
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
