// src/pages/table/TableTransferBarang.jsx
import React, { useEffect, useState } from "react";
import { ref, onValue, remove } from "firebase/database";
import { db } from "../../firebase/FirebaseInit";
import FirebaseService from "../../services/FirebaseService";

export default function TableTransferBarang({ currentRole }) {
  const isSuperAdmin = currentRole === "superadmin";
  const [rows, setRows] = useState([]);

  useEffect(() => {
    return onValue(ref(db, "transfer_barang"), (snap) => {
      const arr = [];
      snap.forEach((c) => arr.push({ id: c.key, ...c.val() }));
      setRows(arr);
    });
  }, []);

  return (
    <div className="mt-8 bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6">
      <h3
        className="
    text-xl font-extrabold mb-4
    bg-gradient-to-r from-indigo-600 to-purple-600
    bg-clip-text text-transparent
  "
      >
        📦 TABEL TRANSFER BARANG
      </h3>
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[1200px] text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-gradient-to-r from-indigo-100 to-purple-100">

            <tr>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">NO</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Tanggal</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">No. DO</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">No. Surat Jalan</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Nama Pengirim</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Toko Pengirim</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Toko Tujuan</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">QTY</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Status</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Brand</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Barang</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">IMEI</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Qty</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">Status</th>
            <th className="border border-slate-300 px-3 py-2 text-left font-bold text-indigo-700">AKSI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
             <tr
             key={r.id}
             className="hover:bg-indigo-50 transition-colors duration-200"
           >
                <td className="hover:bg-slate-50">{i + 1} </td>
                <td>{r.tanggal}</td>
                <td>{r.noDo}</td>
                <td>{r.noSuratJalan}</td>
                <td>{r.pengirim}</td>
                <td>{r.tokoPengirim}</td>
                <td>{r.ke}</td>
                <td>{r.qty}</td>
                <td>{r.tokoPengirim || r.dari}</td>
                <td>{r.ke}</td>
                <td>{r.brand}</td>
                <td>{r.barang}</td>
                <td className="text-xs">{(r.imeis || []).join(", ")}</td>
                <td>{r.qty}</td>
                <td className="font-semibold text-indigo-600">{r.status}</td>

                <td className="flex gap-2">
                  {isSuperAdmin && r.status === "Pending" && (
                    <>
                      <button
                        className="
                        px-4 py-2 rounded-xl text-xs font-bold text-white
                        bg-gradient-to-r from-green-500 to-emerald-600
                        shadow-lg shadow-green-400/40
                        hover:scale-105 hover:shadow-green-400/70
                        active:scale-95
                        transition-all
                      "
                        onClick={() =>
                          FirebaseService.approveTransferFINAL({
                            transfer: r,
                            performedBy: "SUPERADMIN",
                          })
                        }
                      >
                        ✔ APPROVE
                      </button>

                      <button
                       className="
                       px-3 py-2 rounded-xl text-xs font-bold text-white
                       bg-gradient-to-r from-yellow-400 to-orange-500
                       shadow-lg shadow-yellow-400/40
                       hover:scale-105
                       transition
                     "
                        onClick={() =>
                          alert("EDIT (modal bisa kamu lanjutkan)")
                        }
                      >
                        ✏ EDIT
                      </button>

                      <button
                       className="
                       px-3 py-2 rounded-xl text-xs font-bold text-white
                       bg-gradient-to-r from-red-500 to-rose-600
                       shadow-lg shadow-red-400/40
                       hover:scale-105
                       transition
                     "
                        onClick={async () => {
                          await FirebaseService.rejectTransferFINAL(r);
                          await remove(ref(db, `transfer_barang/${r.id}`));
                        }}
                      >
                       ✖ REJECT
                      </button>
                    </>
                  )}

                  {!isSuperAdmin && <span>-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
