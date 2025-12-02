import React, { useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaEdit,
  FaTrash,
  FaEye,
  FaFileExcel,
} from "react-icons/fa";

export default function SalesResultTable({
  rows = [],
  onRemove,
  onEdit,
  onApprove,
  onVoid,
  onPreview,
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

  return (
    <div className="w-full space-y-4">

      {/* HEADER */}
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

      {/* TABLE */}
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
                  Rp {Number(row.item?.hargaUnit || 0).toLocaleString("id-ID")}
                </td>
                <td className="p-2 border text-center">{row.item?.qty}</td>
                <td className="p-2 border text-right font-semibold text-indigo-600">
                  Rp {Number(row.totals?.lineTotal || 0).toLocaleString("id-ID")}
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

      {/* PAGINATION */}
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
  );
}
