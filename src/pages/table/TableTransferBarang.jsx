// src/pages/table/TableTransferBarang.jsx
import React, { useEffect, useState, useMemo } from "react";
import { ref, onValue, update, push } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/FirebaseInit";
import FirebaseService from "../../services/FirebaseService";
import { FaPrint } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function TableTransferBarang({ currentRole }) {
  const isSuperAdmin = String(currentRole || "").toLowerCase() === "superadmin";
  console.log("ROLE USER:", currentRole);
  console.log("IS SUPERADMIN:", isSuperAdmin);
  const [rows, setRows] = useState([]);

  const [inventory, setInventory] = useState([]);
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [preview, setPreview] = useState(null);

  const [soldImeis, setSoldImeis] = useState([]);

  const TOKO_LOGIN = localStorage.getItem("TOKO_LOGIN") || "";

  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const map = {}; // key = imei

      snap.forEach((tokoSnap) => {
        const trxSnap = tokoSnap.child("transaksi");
        if (!trxSnap.exists()) return;

        trxSnap.forEach((trx) => {
          const v = trx.val();
          if (!v.IMEI) return;

          const imei = String(v.IMEI).trim();
          const metode = String(v.PAYMENT_METODE || "").toUpperCase();

          // DEFAULT
          if (!map[imei]) {
            map[imei] = { imei, status: "AVAILABLE" };
          }

          // RULE MUTLAK
          if (metode === "REFUND") {
            map[imei].status = "AVAILABLE";
          } else if (metode === "PENJUALAN") {
            map[imei].status = "SOLD";
          } else if (metode === "TRANSFER_KELUAR") {
            // Jangan matikan barang
            if (map[imei].status !== "SOLD") map[imei].status = "AVAILABLE";
          } else if (metode === "TRANSFER_MASUK") {
            if (map[imei].status !== "SOLD") map[imei].status = "AVAILABLE";
          }
        });
      });

      setInventory(Object.values(map));
    });
  }, []);

  // ================= FILTER TRANSFER: TOLAK IMEI TERJUAL =================
  const safeRows = useMemo(() => {
    return rows.filter((r) => {
      // ✅ TRANSFER SUDAH APPROVED / REJECTED → TAMPIL SELALU
      if (r.status !== "Pending") return true;

      // ⛔ FILTER HANYA UNTUK PENDING
      if (!Array.isArray(r.imeis)) return false;

      return r.imeis.every((im) => {
        const found = inventory.find((i) => i.imei === im);
        return (
          found &&
          [
            "AVAILABLE",
            "REFUND",
            "TRANSFER_MASUK",
            "OUT", // ✅ ini yang bikin barang transfer bisa transfer lagi
          ].includes(found.status)
        );
      });
    });
  }, [rows, inventory]);

  const rowsByToko = useMemo(() => {
    if (isSuperAdmin) return safeRows;

    return safeRows.filter((r) => {
      const pengirim = String(r.tokoPengirim || "").toUpperCase();
      const tujuan = String(r.ke || "").toUpperCase();
      const tokoLogin = TOKO_LOGIN.toUpperCase();

      return pengirim === tokoLogin || tujuan === tokoLogin;
    });
  }, [safeRows, TOKO_LOGIN, isSuperAdmin]);

  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const map = {}; // key = imei

      snap.forEach((tokoSnap) => {
        const trxSnap = tokoSnap.child("transaksi");
        if (!trxSnap.exists()) return;

        trxSnap.forEach((trx) => {
          const v = trx.val();
          if (!v.IMEI) return;

          const imei = String(v.IMEI).trim();
          const metode = String(v.PAYMENT_METODE || "").toUpperCase();

          // DEFAULT
          if (!map[imei]) {
            map[imei] = { imei, status: "AVAILABLE" };
          }

          if (
            metode === "PEMBELIAN" ||
            metode === "REFUND" ||
            metode === "TRANSFER_MASUK" ||
            metode === "INPUT_STOK"
          ) {
            map[imei].status = "AVAILABLE";
          } else if (metode === "PENJUALAN") {
            map[imei].status = "SOLD";
          } else if (metode === "TRANSFER_KELUAR") {
            if (map[imei].status !== "SOLD") map[imei].status = "OUT";
          }
        });
      });

      setInventory(Object.values(map));
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "transfer_barang"), (snap) => {
      const arr = [];

      snap.forEach((c) => {
        const val = c.val();
        if (!val || typeof val !== "object") return;

        const imeis = Array.isArray(val.imeis) ? val.imeis : [];

        const uniqueImeis = [...new Set(imeis.map((i) => String(i).trim()))];

        arr.push({
          id: c.key,
          ...val,
          imeis: uniqueImeis,

          // ✅ FIX QTY FINAL
          qty:
            uniqueImeis.length > 0 ? uniqueImeis.length : Number(val.qty || 0),
        });
      });

      console.log("🔥 DATA TRANSFER TABLE:", arr);
      setRows(arr);
    });
  }, []);

  const getSafeQty = (transfer, safeImeis) => {
    // IMEI barang
    if (safeImeis.length > 0) {
      return safeImeis.length;
    }

    // ACCESSORIES
    const q = Number(transfer.qty);

    if (!isNaN(q) && q > 0) return q;

    return 1;
  };

  const handleRejectAndRollback = async (r) => {
    if (!window.confirm("Yakin REJECT & kembalikan stok ke toko pengirim?"))
      return;

    try {
      const now = Date.now();

      // 🔁 1. BALIKKAN IMEI KE TOKO PENGIRIM (inventory)
      if (Array.isArray(r.imeis)) {
        for (const imei of r.imeis) {
          await update(ref(db, `inventory/${r.tokoPengirim}/${imei}`), {
            STATUS: "REFUND",
            TRANSFER_ID: null,
            UPDATED_AT: now,
          });
        }
      }

      // 🔁 2. CATAT TRANSAKSI BALIK (TRANSFER_MASUK KE PENGIRIM)
      await push(ref(db, "transaksi"), {
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
        NO_INVOICE: r.noDo || r.id,
        NAMA_TOKO: r.tokoPengirim,
        NAMA_BRAND: r.brand,
        NAMA_BARANG: r.barang,
        IMEI: Array.isArray(r.imeis) ? r.imeis.join(",") : "",
        QTY: r.qty || 1,
        PAYMENT_METODE: "TRANSFER_MASUK",
        STATUS: "Approved",
        SOURCE: "REJECT_TRANSFER",
        CREATED_AT: now,
      });

      // 🔁 3. UPDATE STATUS TRANSFER
      await update(ref(db, `transfer_barang/${r.id}`), {
        status: "Rejected",
        rejectedAt: now,
      });

      alert("✅ Transfer di-Reject, stok kembali ke toko pengirim");
    } catch (err) {
      console.error(err);
      alert("❌ Gagal reject & rollback stok");
    }
  };

  const handleExportExcel = () => {
    const filteredData = rows.filter(
      (r) => filterStatus === "ALL" || r.status === filterStatus
    );

    const excelData = filteredData.map((r, i) => ({
      No: i + 1,
      Tanggal: r.tanggal || "-",
      "No DO": r.noDo || "-",
      "No Surat Jalan": r.noSuratJalan || "-",
      Pengirim: r.pengirim || "-",
      "Toko Pengirim": r.tokoPengirim || "-",
      "Toko Tujuan": r.ke || "-",
      Brand: r.brand || "-",
      Barang: r.barang || "-",
      IMEI: Array.isArray(r.imeis) ? r.imeis.join(", ") : "-",
      Qty: r.qty || 0,
      Status: r.status || "Pending",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transfer Barang");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(fileData, `Transfer_Barang_${Date.now()}.xlsx`);
  };

  const isImeiAlreadyUsed = (imei) => {
    const found = inventory.find(
      (i) => String(i.imei).trim() === String(imei).trim()
    );

    // tidak ditemukan di inventory → anggap tidak valid
    if (!found) return true;

    // ❌ HANYA SOLD yang tidak boleh
    if (found.status === "SOLD") return true;

    // ✅ semua status selain SOLD boleh transfer lagi
    return false;
  };

  return (
    <div
      id="table-transfer-barang"
      className="mt-8 bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6"
    >
      <h3 className="text-xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        📦 TABEL TRANSFER BARANG
      </h3>

      <div className="hover:bg-indigo-50 transition-colors p-2 flex gap-3">
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

        <button
          onClick={handleExportExcel}
          className="
      px-4 py-2 rounded-xl text-sm font-bold text-white
      bg-gradient-to-r from-emerald-500 to-green-600
      hover:scale-105 transition
    "
        >
          ⬇ EXPORT EXCEL
        </button>
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
            {rowsByToko
              .filter(
                (r) => filterStatus === "ALL" || r.status === filterStatus
              )
              .map((r, i) => {
                // ✅ CEK TOKO TUJUAN
                const isTokoTujuan =
                  String(r.ke || "").toUpperCase() === TOKO_LOGIN.toUpperCase();

                // ✅ YANG BOLEH APPROVE
                const canApprove =
                  (isSuperAdmin || isTokoTujuan) && r.status === "Pending";

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-indigo-50 transition-colors p-2"
                  >
                    <td className="border px-3 py-2">{i + 1}</td>
                    <td className="border px-3 py-2">{r.tanggal || "-"}</td>
                    <td className="border px-3 py-2">{r.noDo || "-"}</td>
                    <td className="border px-3 py-2">
                      {r.noSuratJalan || "-"}
                    </td>
                    <td className="border px-3 py-2">{r.pengirim || "-"}</td>
                    <td className="border px-3 py-2">
                      {r.tokoPengirim || "-"}
                    </td>
                    <td className="border px-3 py-2">{r.ke || "-"}</td>
                    <td className="border px-3 py-2">{r.brand || "-"}</td>
                    <td className="border px-3 py-2">{r.barang || "-"}</td>

                    <td className="border px-3 py-2 text-xs">
                      {Array.isArray(r.imeis)
                        ? r.imeis.map((im) => {
                            const found = inventory.find((i) => i.imei === im);
                            return (
                              <div key={im}>
                                {im} ({found?.status || "?"})
                              </div>
                            );
                          })
                        : "-"}
                    </td>

                    <td className="border px-3 py-2 text-center font-semibold">
                      {r.qty || 0}
                    </td>

                    <td className="border px-3 py-2 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold
                ${r.status === "Approved" ? "bg-green-100 text-green-700" : ""}
                ${r.status === "Pending" ? "bg-yellow-100 text-yellow-700" : ""}
                ${r.status === "Rejected" ? "bg-red-100 text-red-700" : ""}
                ${r.status === "Voided" ? "bg-gray-200 text-gray-700" : ""}
              `}
                      >
                        {r.status || "Pending"}
                      </span>
                    </td>

                    {/* ===== AKSI ===== */}
                    <td className="border px-3 py-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          title="Approve Transfer"
                          disabled={!canApprove}
                          onClick={async () => {
                            if (!canApprove) return;

                            for (const imei of r.imeis || []) {
                              if (isImeiAlreadyUsed(imei)) {
                                alert(`❌ IMEI ${imei} sudah pernah dipakai!`);
                                return;
                              }
                            }

                            const sjId =
                              await FirebaseService.approveTransferFINAL({
                                transfer: r,
                              });

                            navigate(`/surat-jalan/${sjId}`);
                          }}
                          className={`px-3 py-2 rounded-lg text-[11px] font-bold
    ${
      !canApprove
        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        : "bg-green-500 text-white hover:bg-green-600"
    }
  `}
                        >
                          ✔ Approve
                        </button>

                        {/* REJECT (SUPERADMIN ONLY) */}
                        <button
                          disabled={!isSuperAdmin || r.status !== "Pending"}
                          onClick={async () => {
                            if (!isSuperAdmin) return;
                            await FirebaseService.rejectTransferFINAL({
                              transfer: r,
                            });
                            alert("Transfer ditolak");
                          }}
                          className={`px-3 py-2 rounded-lg text-[11px] font-bold
                  ${
                    !isSuperAdmin || r.status !== "Pending"
                      ? "bg-gray-300 text-gray-500"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }
                `}
                        >
                          ✖ Reject
                        </button>

                        {/* PRINT */}
                        <button
                          disabled={!isSuperAdmin}
                          onClick={() => {
                            if (!isSuperAdmin) return;
                            const sjId = r.suratJalanId || r.id;
                            navigate(`/surat-jalan/${sjId}`);
                          }}
                          className="px-3 py-2 rounded-lg text-[11px] font-bold bg-indigo-500 text-white hover:bg-indigo-600"
                        >
                          <FaPrint /> Print Surat Jalan
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
