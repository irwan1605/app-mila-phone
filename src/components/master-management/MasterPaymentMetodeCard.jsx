import React, { useEffect, useState } from "react";
import {
  listenMasterPaymentMetode,
  addMasterPaymentMetode,
  updateMasterPaymentMetode,
  deleteMasterPaymentMetode,
} from "../../services/FirebaseService";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

export default function MasterPaymentMetodeCard() {
  const [rows, setRows] = useState([]);
  const [nama, setNama] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const unsub = listenMasterPaymentMetode(setRows);
    return () => unsub && unsub();
  }, []);

  const save = async () => {
    if (!nama) return alert("Nama wajib diisi");

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
      <h2 className="font-bold mb-3">MASTER PAYMENT METODE</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama Payment Metode"
          className="border px-3 py-2 rounded w-full"
        />
        <button onClick={save} className="bg-indigo-600 text-white px-4 rounded">
          <FaPlus />
        </button>
      </div>

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
                <button onClick={() => { setEditId(r.id); setNama(r.nama); }}>
                  <FaEdit />
                </button>
                <button onClick={() => deleteMasterPaymentMetode(r.id)}>
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
