import React, { useEffect, useState } from "react";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { db } from "../../FirebaseInit";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const basePath = "dataManagement/masterLeasing";

export default function MasterLeasingCard() {
  const [rows, setRows] = useState([]);
  const [namaLeasing, setNamaLeasing] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    return onValue(ref(db, basePath), (snap) => {
      const val = snap.val() || {};
      setRows(Object.entries(val).map(([id, v]) => ({ id, ...v })));
    });
  }, []);

  const save = async () => {
    if (!namaLeasing) return alert("Nama Leasing wajib diisi");

    if (editId) {
      await update(ref(db, `${basePath}/${editId}`), { namaLeasing });
    } else {
      const r = push(ref(db, basePath));
      await set(r, { id: r.key, namaLeasing });
    }

    setNamaLeasing("");
    setEditId(null);
  };

  return (
    <div>
      <h2 className="font-bold mb-3">MASTER LEASING</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={namaLeasing}
          onChange={(e) => setNamaLeasing(e.target.value)}
          placeholder="Nama Leasing"
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
            <th className="p-2">NAMA LEASING</th>
            <th className="p-2">AKSI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{r.namaLeasing}</td>
              <td className="p-2 flex justify-center gap-2">
                <button onClick={() => { setEditId(r.id); setNamaLeasing(r.namaLeasing); }}>
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
