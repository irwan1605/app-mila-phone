import React, { useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaEdit,
  FaTrash,
  FaEye,
  FaFileExcel,
  FaPaperPlane,
} from "react-icons/fa";

/*
  ✅ PROPS LAMA (TETAP):
  - rows
  - onRemove
  - onEdit
  - onApprove
  - onVoid
  - onPreview
  - totals
  - onExport

  ✅ PROPS BARU:
  - searchRows            → data hasil pencarian IMEI
  - onSubmitFromSearch   → (row) => masukkan ke tabel utama
  - onPreviewSearch      → preview invoice dari tabel pencarian
*/

export default function SalesResultTable({
  rows = [],
  searchRows = [],
  onSubmitFromSearch,
  onPreviewSearch,
  onRemove,
  onEdit,
  onApprove,
  onVoid,
  onPreview,
  totals = { totalItems: 0, totalAmount: 0 },
  onExport,
}) {
  /* ================== PAGINATION ================== */
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.ceil(rows.length / pageSize);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  /* ================== RENDER ================== */
  return (
    <div className="w-full space-y-8">

      {/* ======================= */}
      {/* ✅ TABEL UTAMA (ATAS) */}
      {/* ======================= */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm uppercase">
              Tabel Utama Hasil Transaksi
            </h2>
            <p className="text-xs text-slate-500">
              Data resmi transaksi penjualan.
            </p>
          </div>

          <button
            onClick={onExport}
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm flex items-center gap-1 hover:bg-emerald-700"
          >
            <FaFileExcel /> Export Excel
          </button>
        </div>

        {/* TABLE UTAMA */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">Invoice</th>
                <th className="p-2 border">Toko</th>
                <th className="p-2 border">Nama Barang</th>
                <th className="p-2 border">IMEI</th>
                <th className="p-2 border">Harga</th>
                <th className="p-2 border">QTY</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-slate-500">
                    Belum ada transaksi.
                  </td>
                </tr>
              )}

              {pagedRows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50">
                  <td className="p-2 border">{row.tanggal}</td>
                  <td className="p-2 border">{row.invoice}</td>
                  <td className="p-2 border">{row.tokoName}</td>
                  <td className="p-2 border">{row.item?.namaBarang}</td>
                  <td className="p-2 border font-mono text-[11px]">
                    {(row.item?.imei || "").split("\n").join(", ")}
                  </td>
                  <td className="p-2 border text-right">
                    Rp{" "}
                    {Number(row.item?.hargaUnit || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-2 border text-center">{row.item?.qty}</td>
                  <td className="p-2 border text-right font-semibold text-indigo-600">
                    Rp{" "}
                    {Number(row.totals?.lineTotal || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-2 border text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        row.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : row.status === "VOID"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-2 border text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onApprove(row.id)}
                        className="text-green-600"
                      >
                        <FaCheckCircle />
                      </button>
                      <button
                        onClick={() => onPreview(row.id)}
                        className="text-indigo-600"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => onEdit(row.id)}
                        className="text-blue-600"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => onVoid(row.id)}
                        className="text-red-600"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ PAGINATION */}
        <div className="mt-2 flex justify-between items-center text-xs">
          <span>
            Halaman {page} / {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-2 py-1 border rounded"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="px-2 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* ✅ TABEL TRANSAKSI DARI PENCARIAN IMEI */}
      {/* ========================================= */}
      <div>
        <h2 className="font-semibold text-slate-800 text-sm mb-2">
          Tabel Transaksi Berdasarkan Pencarian IMEI
        </h2>

        <div className="overflow-x-auto border border-indigo-200 rounded-xl bg-indigo-50">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-indigo-100">
              <tr>
                <th className="p-2 border">Nama Barang</th>
                <th className="p-2 border">IMEI</th>
                <th className="p-2 border">QTY</th>
                <th className="p-2 border">Harga</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {searchRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Belum ada hasil pencarian IMEI.
                  </td>
                </tr>
              )}

              {searchRows.map((row, i) => (
                <tr key={i}>
                  <td className="p-2 border">{row.item?.namaBarang}</td>
                  <td className="p-2 border">{row.item?.imei}</td>
                  <td className="p-2 border text-center">{row.item?.qty}</td>
                  <td className="p-2 border text-right">
                    Rp{" "}
                    {Number(row.item?.hargaUnit || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-2 border text-right font-bold">
                    Rp{" "}
                    {Number(row.totals?.lineTotal || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-2 border text-center flex justify-center gap-2">
                    {/* ✅ PREVIEW */}
                    <button
                      onClick={() => onPreviewSearch?.(row)}
                      className="text-indigo-600"
                      title="Preview Invoice"
                    >
                      <FaEye />
                    </button>

                    {/* ✅ SUBMIT KE TABEL UTAMA */}
                    <button
                      onClick={() => onSubmitFromSearch?.(row)}
                      className="text-green-600"
                      title="Submit ke Tabel Utama"
                    >
                      <FaPaperPlane />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ FOOTER TOTAL + PREVIEW GLOBAL */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm">
        <div className="flex items-center gap-4">
          <span>
            <b>Total Item:</b> {totals.totalItems}
          </span>
          <span>
            <b>Grand Total:</b>{" "}
            <span className="text-indigo-600 font-bold">
              Rp{" "}
              {Number(totals.totalAmount || 0).toLocaleString("id-ID")}
            </span>
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onPreview("GLOBAL")}
            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs sm:text-sm"
          >
            Preview Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
