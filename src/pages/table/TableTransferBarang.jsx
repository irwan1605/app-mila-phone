// src/pages/table/TableTransferBarang.jsx
import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/FirebaseInit";
import FirebaseService from "../../services/FirebaseService";

export default function TableTransferBarang({ currentRole }) {
  const isSuperAdmin = currentRole === "superadmin";
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("ALL");

 useEffect(() => {
  return onValue(ref(db, "transfer_barang"), (snap) => {
    const arr = [];
    snap.forEach((c) =>
      arr.push({ id: c.key, ...c.val() })
    );
    setRows(arr);
  });
}, []);

  return (
    <div className="mt-8 bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6">
      <h3 className="text-xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        📦 TABEL TRANSFER BARANG
      </h3>

      <div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input max-w-xs"
        >
          <option value="ALL">SEMUA</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Voided">Voided</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-300">
        <table className="w-full min-w-[1200px] text-sm border-collapse">
          <thead className="bg-gradient-to-r from-indigo-100 to-purple-100">
            <tr>
              {[
                "No",
                "Tanggal",
                "No DO",
                "No Surat Jalan",
                "Pengirim",
                "Toko Pengirim",
                "Toko Tujuan",
                "Brand",
                "Barang",
                "IMEI",
                "Qty",
                "Status",
                "Aksi",
              ].map((h) => (
                <th
                  key={h}
                  className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-indigo-50 transition-colors">
                <td className="border px-3 py-2">{i + 1}</td>
                <td className="border px-3 py-2">{r.tanggal}</td>
                <td className="border px-3 py-2">{r.noDo}</td>
                <td className="border px-3 py-2">{r.noSuratJalan}</td>
                <td className="border px-3 py-2">{r.pengirim}</td>
                <td className="border px-3 py-2">{r.tokoPengirim}</td>
                <td className="border px-3 py-2">{r.ke}</td>
                <td className="border px-3 py-2">{r.brand}</td>
                <td className="border px-3 py-2">{r.barang}</td>
                <td className="border px-3 py-2 text-xs">
                  {(r.imeis || []).join(", ")}
                </td>
                <td className="border px-3 py-2 text-center font-semibold">
                  {r.qty}
                </td>
                <td className="border px-3 py-2 font-semibold text-indigo-600">
                  {r.status}
                </td>

                <td className="border px-3 py-2">
                  {isSuperAdmin && r.status === "Pending" ? (
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 transition"
                        onClick={async () => {
                          const sjId =
                            await FirebaseService.approveTransferFINAL({
                              transfer: r,
                            });
                          navigate(`/surat-jalan/${sjId}`);
                        }}
                      >
                        ✔ APPROVE & CETAK
                      </button>

                      <button
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 transition"
                        onClick={async () => {
                          await FirebaseService.rejectTransferFINAL(r);
                        }}
                      >
                        ✖ REJECT
                      </button>
                    </div>
                  ) : (
                    <span>-</span>
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
