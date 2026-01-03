// src/pages/table/TableTransferBarang.jsx
import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/FirebaseInit";
import FirebaseService from "../../services/FirebaseService";
import { FaPrint } from "react-icons/fa";

export default function TableTransferBarang({ currentRole }) {
  const isSuperAdmin = currentRole === "superadmin";
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    return onValue(ref(db, "transfer_barang"), (snap) => {
      const arr = [];

      snap.forEach((c) => {
        const val = c.val();

        // 🔥 JIKA DATA VALID OBJECT
        if (val && typeof val === "object" && !Array.isArray(val)) {
          arr.push({
            id: c.key,
            ...val,
            status: String(val.status || "Pending"),
          });
        }
      });

      console.log("🔥 DATA TRANSFER TABLE:", arr);
      setRows(arr);
    });
  }, []);

  return (
    <div
      id="table-transfer-barang"
      className="mt-8 bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6"
    >
      <h3 className="text-xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        📦 TABEL TRANSFER BARANG
      </h3>

      <div className="hover:bg-indigo-50 transition-colors p-2">
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

      <div className="overflow-x-auto rounded-xl border border-slate-300 p-2">
        <table className="w-full min-w-[1200px] text-sm border-collapse p-2">
          <thead className="bg-gradient-to-r from-indigo-100 to-purple-100 p-2">
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
            {rows
              .filter(
                (r) => filterStatus === "ALL" || r.status === filterStatus
              )
              .map((r, i) => (
                <tr
                  key={r.id}
                  className="hover:bg-indigo-50 transition-colors p-2"
                >
                  <td className="border px-3 py-2">{i + 1}</td>
                  <td className="border px-3 py-2">{r.tanggal || "-"}</td>
                  <td className="border px-3 py-2">{r.noDo || "-"}</td>
                  <td className="border px-3 py-2">{r.noSuratJalan || "-"}</td>
                  <td className="border px-3 py-2">{r.pengirim || "-"}</td>
                  <td className="border px-3 py-2">{r.tokoPengirim || "-"}</td>
                  <td className="border px-3 py-2">{r.ke || "-"}</td>
                  <td className="border px-3 py-2">{r.brand || "-"}</td>
                  <td className="border px-3 py-2">{r.barang || "-"}</td>
                  <td className="border px-3 py-2 text-xs">
                    {Array.isArray(r.imeis) ? r.imeis.join(", ") : "-"}
                  </td>
                  <td className="border px-3 py-2 text-center font-semibold">
                    {r.qty || 0}
                  </td>
                  <td className="border px-3 py-2 font-semibold text-indigo-600">
                    {r.status || "Pending"}
                  </td>

                  {preview && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl p-6 w-[500px]">
                        <h3 className="font-bold mb-3">Preview Transfer</h3>

                        <p>📦 Dari: {preview.tokoAsal}</p>
                        <p>🏬 Ke: {preview.tokoTujuan}</p>

                        <ul className="mt-3 max-h-40 overflow-auto">
                          {preview.imeis.map((i) => (
                            <li key={i}>• {i}</li>
                          ))}
                        </ul>

                        <button
                          onClick={() => setPreview(null)}
                          className="mt-4 bg-slate-700 text-white px-4 py-2 rounded"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  )}

                  <td className="border px-3 py-2 space-y-1">
                    {/* APPROVE / REJECT */}
                    {isSuperAdmin && r.status === "Pending" && (
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-2 rounded-xl text-xs font-bold text-white
                   bg-gradient-to-r from-green-500 to-emerald-600"
                          onClick={async () => {
                            const sjId =
                              await FirebaseService.approveTransferFINAL({
                                transfer: r,
                              });
                            navigate(`/surat-jalan/${sjId}`);
                          }}
                        >
                          ✔ APPROVE
                        </button>

                        <button
                          className="px-3 py-2 rounded-xl text-xs font-bold text-white
                   bg-gradient-to-r from-red-500 to-rose-600"
                          onClick={async () => {
                            await FirebaseService.rejectTransferFINAL({
                              transfer: r,
                            });
                            alert("Transfer ditolak & IMEI dikembalikan");
                          }}
                        >
                          ✖ REJECT
                        </button>
                      </div>
                    )}

                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          // PRIORITAS:
                          // 1. Jika sudah Approved → pakai suratJalanId
                          // 2. Jika belum Approved → pakai transfer.id (antisipasi cetak ulang)
                          const sjId = r.suratJalanId || r.id;

                          navigate(`/surat-jalan/${sjId}`);
                        }}
                        className="
        w-full flex items-center justify-center gap-2
        px-3 py-2 rounded-xl
        text-xs font-bold text-white
        bg-gradient-to-r from-indigo-500 to-purple-600
        hover:scale-105 transition
      "
                        title="Cetak ulang Surat Jalan (Superadmin)"
                      >
                        <FaPrint /> PRINT SURAT JALAN
                      </button>
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
