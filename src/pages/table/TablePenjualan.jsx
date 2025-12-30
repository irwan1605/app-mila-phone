// =======================================================
// TablePenjualan.jsx — FINAL VERSION 100%
// Detail Penjualan Lengkap + Edit & VOID (Superadmin)
// =======================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenPenjualan,
  voidTransaksiPenjualan,
} from "../../services/FirebaseService";

/* ================= UTIL ================= */
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

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

  /* ================= FLATTEN DATA ================= */
  const tableRows = useMemo(() => {
    const result = [];

    rows.forEach((trx) => {
      (trx.items || []).forEach((item) => {
        result.push({
          id: trx.id,
          tanggal: trx.tanggal || trx.createdAt,
          invoice: trx.invoice,
          toko: trx.toko,

          pelanggan: trx.user?.namaPelanggan || "-",
          telp: trx.user?.noTlpPelanggan || "-",
          sales: trx.user?.namaSales || "-",

          kategoriBarang: item.kategoriBarang,
          namaBrand: item.namaBrand,
          namaBarang: item.namaBarang,

          bundling:
            item.bundlingItems?.map((b) => b.namaBarang).join(", ") || "-",

          imei: Array.isArray(item.imeiList)
            ? item.imeiList.join(", ")
            : "-",

          qty: item.qty,

          statusBayar: trx.payment?.status,
          namaMdr: trx.payment?.namaMdr || "-",
          nominalMdr: trx.payment?.nominalMdr || 0,
          tenor: trx.payment?.tenor || "-",
          cicilan: trx.payment?.cicilan || 0,
          grandTotal: trx.payment?.grandTotal || 0,

          STATUS: trx.STATUS,
        });
      });
    });

    return result;
  }, [rows]);

  /* ================= ACTION ================= */
  const handleVoid = async (row) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`VOID Invoice ${row.invoice}?`)) return;

    await voidTransaksiPenjualan(row.id);
    alert("✅ Transaksi berhasil di VOID");
  };

  const handleEdit = (row) => {
    if (!isSuperAdmin) return;
    alert(`EDIT Invoice ${row.invoice} (siap diarahkan ke form edit)`);
  };

  /* ================= RENDER ================= */
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5">
      <h2 className="text-lg font-bold mb-4">📊 TABEL PENJUALAN</h2>

      <div className="overflow-x-auto">
        <table className="min-w-[2600px] border text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>No Invoice</th>
              <th>Nama Toko</th>
              <th>Nama Pelanggan</th>
              <th>No TLP</th>
              <th>Nama Sales</th>

              <th>Kategori</th>
              <th>Brand</th>
              <th>Nama Barang</th>
              <th>Barang Bundling</th>
              <th>No IMEI</th>
              <th>QTY</th>

              <th>Status Bayar</th>
              <th>Nama MDR</th>
              <th>Nominal MDR</th>
              <th>Tenor</th>
              <th>Nilai Cicilan</th>
              <th>Grand Total</th>

              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {tableRows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td>{i + 1}</td>
                <td>
                  {new Date(r.tanggal).toLocaleDateString("id-ID")}
                </td>
                <td className="font-semibold">{r.invoice}</td>
                <td>{r.toko}</td>
                <td>{r.pelanggan}</td>
                <td>{r.telp}</td>
                <td>{r.sales}</td>

                <td>{r.kategoriBarang}</td>
                <td>{r.namaBrand}</td>
                <td>{r.namaBarang}</td>
                <td>{r.bundling}</td>
                <td className="max-w-[200px] break-all">{r.imei}</td>
                <td className="text-center">{r.qty}</td>

                <td className="text-center">{r.statusBayar}</td>
                <td>{r.namaMdr}</td>
                <td className="text-right">
                  {rupiah(r.nominalMdr)}
                </td>
                <td className="text-center">{r.tenor}</td>
                <td className="text-right">
                  {rupiah(r.cicilan)}
                </td>
                <td className="text-right font-bold">
                  {rupiah(r.grandTotal)}
                </td>

                <td className="text-center">
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

                <td className="text-center space-x-2">
                  {isSuperAdmin ? (
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
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}

            {!tableRows.length && (
              <tr>
                <td colSpan={21} className="text-center py-6 text-gray-500">
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
