// =======================================================
// TablePenjualan.jsx — FINAL VERSION 100% FIXED
// Detail Penjualan Lengkap + Pagination + Edit & VOID
// =======================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenPenjualan,
  voidTransaksiPenjualan,
} from "../../services/FirebaseService";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

/* ================= UTIL ================= */
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

export default function TablePenjualan() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

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
        toko: trx.toko || "-",

        pelanggan: trx.user?.namaPelanggan || "-",
        telp: trx.user?.noTlpPelanggan || "-",
        sales: trx.user?.namaSales || "-",

        kategoriBarang: item.kategoriBarang || "-",
        namaBrand: item.namaBrand || "-",
        namaBarang: item.namaBarang || "-",

        bundling:
          item.bundlingItems?.map((b) => b.namaBarang).join(", ") || "-",

        imei: Array.isArray(item.imeiList)
          ? item.imeiList.join(", ")
          : "-",

        qty: Number(item.qty || 0),

        statusBayar: trx.payment?.status || "-",
        namaMdr: trx.payment?.namaMdr || "-",
        nominalMdr: trx.payment?.nominalMdr || 0,
        tenor: trx.payment?.tenor || "-",
        cicilan: trx.payment?.cicilan || 0,
        grandTotal: trx.payment?.grandTotal || 0,

        status: trx.statusPembayaran || "OK",
      });
    });
  });

  return result;
}, [rows]);

/* ================= PAGINATION ================= */
const pageCount = Math.ceil(tableRows.length / pageSize);

  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, page]);

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

  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    doc.text("LAPORAN PENJUALAN", 14, 10);

    doc.autoTable({
      startY: 15,
      head: [
        [
          "No",
          "Tanggal",
          "Invoice",
          "Toko",
          "Barang",
          "IMEI",
          "QTY",
          "Grand Total",
          "Status",
        ],
      ],
      body: tableRows.map((r, i) => [
        i + 1,
        new Date(r.tanggal).toLocaleDateString("id-ID"),
        r.invoice,
        r.toko,
        r.namaBarang,
        r.imei,
        r.qty,
        rupiah(r.grandTotal),
        r.status,
      ]),
      styles: { fontSize: 8 },
    });

    doc.save(`Laporan_Penjualan_${Date.now()}.pdf`);
  };

   /* ================= EXPORT EXCEL ================= */
   const exportExcel = () => {
    const data = tableRows.map((r, i) => ({
      No: i + 1,
      Tanggal: new Date(r.tanggal).toLocaleDateString("id-ID"),
      Invoice: r.invoice,
      Toko: r.toko,
      Pelanggan: r.pelanggan,
      Telp: r.telp,
      Sales: r.sales,
      Kategori: r.kategoriBarang,
      Brand: r.namaBrand,
      Barang: r.namaBarang,
      Bundling: r.bundling,
      IMEI: r.imei,
      QTY: r.qty,
      StatusBayar: r.statusBayar,
      MDR: r.namaMdr,
      NominalMDR: r.nominalMdr,
      Tenor: r.tenor,
      Cicilan: r.cicilan,
      GrandTotal: r.grandTotal,
      Status: r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Penjualan");

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer]),
      `Laporan_Penjualan_${Date.now()}.xlsx`
    );
  };


  /* ================= RENDER ================= */
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5">
      <h2 className="text-lg font-bold mb-4">📊 TABEL PENJUALAN</h2>

      <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Export Excel
          </button>

          <button
            onClick={exportPDF}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Export PDF
          </button>
        </div>

      {/* SCROLL HORIZONTAL */}
      <div className="overflow-x-auto">
        <table className="min-w-[2400px] text-sm">
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
            {pagedData.map((row, i) => (
              <tr
                key={`${row.invoice}-${i}`}
                className="border-t hover:bg-gray-50"
              >
                <td>{(page - 1) * pageSize + i + 1}</td>
                <td>
                  {row.tanggal
                    ? new Date(row.tanggal).toLocaleDateString("id-ID")
                    : "-"}
                </td>
                <td className="font-semibold">{row.invoice}</td>
                <td>{row.toko}</td>
                <td>{row.pelanggan}</td>
                <td>{row.telp}</td>
                <td>{row.sales}</td>

                <td>{row.kategoriBarang}</td>
                <td>{row.namaBrand}</td>
                <td>{row.namaBarang}</td>
                <td>{row.bundling}</td>
                <td className="max-w-[200px] break-all">{row.imei}</td>
                <td className="text-center">{row.qty}</td>

                <td className="text-center">{row.statusBayar}</td>
                <td>{row.namaMdr}</td>
                <td className="text-right">{rupiah(row.nominalMdr)}</td>
                <td className="text-center">{row.tenor}</td>
                <td className="text-right">{rupiah(row.cicilan)}</td>
                <td className="text-right font-bold">
                  {rupiah(row.grandTotal)}
                </td>

                <td className="text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      row.status === "VOID"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>

                <td className="text-center space-x-2">
                  {isSuperAdmin ? (
                    <>
                      <button
                        onClick={() => handleEdit(row)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleVoid(row)}
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

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span>
          Page {page} / {pageCount || 1}
        </span>

        <button
          disabled={page === pageCount}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
