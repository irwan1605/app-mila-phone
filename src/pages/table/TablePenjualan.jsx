// =======================================================
// TablePenjualan.jsx — FINAL 100%
// Laporan Penjualan | Edit & VOID Superadmin
// =======================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenPenjualan,
  updateTransaksi,
  voidTransaksiPenjualan,
} from "../../services/FirebaseService";

export default function TablePenjualan() {
  const [rows, setRows] = useState([]);

  /* ================= USER LOGIN ================= */
  const userLogin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userLogin")) || {};
    } catch {
      return {};
    }
  }, []);

  const isSuperAdmin =
    userLogin?.role === "superadmin" || userLogin?.role === "admin";

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const unsub = listenPenjualan((data) => {
      setRows(Array.isArray(data) ? data : []);
    });
    return () => unsub && unsub();
  }, []);

  /* ================= HANDLER ================= */
  const handleVoid = async (row) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`VOID transaksi ${row.invoice}?`)) return;

    await voidTransaksiPenjualan(row.id);
    alert("✅ Transaksi berhasil di VOID");
  };

  const handleEdit = (row) => {
    if (!isSuperAdmin) return;
    alert(`EDIT invoice ${row.invoice} (siap disambung ke form)`);
  };

  /* ================= FORMAT ================= */
  const rupiah = (n) =>
    Number(n || 0).toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-lg font-bold mb-4">📊 LAPORAN PENJUALAN</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Tanggal</th>
              <th className="border px-2 py-1">Invoice</th>
              <th className="border px-2 py-1">Toko</th>
              <th className="border px-2 py-1">Pelanggan</th>
              <th className="border px-2 py-1">No Tlp</th>
              <th className="border px-2 py-1">Sales</th>
              <th className="border px-2 py-1">Total Barang</th>

              {/* PAYMENT */}
              <th className="border px-2 py-1">Status Bayar</th>
              <th className="border px-2 py-1">Metode</th>
              <th className="border px-2 py-1">MDR</th>
              <th className="border px-2 py-1">Tenor</th>
              <th className="border px-2 py-1">Grand Total</th>

              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">
                  {new Date(r.createdAt).toLocaleDateString("id-ID")}
                </td>
                <td className="border px-2 py-1 font-semibold">
                  {r.invoice}
                </td>
                <td className="border px-2 py-1">{r.toko}</td>
                <td className="border px-2 py-1">
                  {r.user?.namaPelanggan}
                </td>
                <td className="border px-2 py-1">
                  {r.user?.noTlpPelanggan}
                </td>
                <td className="border px-2 py-1">
                  {r.user?.namaSales}
                </td>
                <td className="border px-2 py-1 text-right">
                  {rupiah(r.totalBarang)}
                </td>

                {/* PAYMENT */}
                <td className="border px-2 py-1 text-center">
                  {r.payment?.status}
                </td>
                <td className="border px-2 py-1 text-center">
                  {r.payment?.paymentMethod}
                </td>
                <td className="border px-2 py-1 text-center">
                  {r.payment?.namaMdr
                    ? `${r.payment.namaMdr} (${r.payment.persenMdr}%)`
                    : "-"}
                </td>
                <td className="border px-2 py-1 text-center">
                  {r.payment?.tenor || "-"}
                </td>
                <td className="border px-2 py-1 text-right font-bold">
                  {rupiah(r.payment?.grandTotal)}
                </td>

                <td className="border px-2 py-1 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      r.STATUS === "VOID"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {r.STATUS}
                  </span>
                </td>

                <td className="border px-2 py-1 text-center space-x-2">
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(r)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleVoid(r)}
                        className="text-red-600 hover:underline"
                      >
                        VOID
                      </button>
                    </>
                  )}
                  {!isSuperAdmin && <span>-</span>}
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td
                  colSpan={14}
                  className="text-center py-6 text-gray-500"
                >
                  Belum ada data penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
